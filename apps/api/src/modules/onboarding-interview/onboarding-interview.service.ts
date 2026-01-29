import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { InterviewFlowService, QuestionCategory } from './interview-flow.service';
import { OnboardingStatus, Prisma } from '@prisma/client';

export interface InterviewMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  questionId?: string;
}

export interface ProgressInfo {
  completed: number;
  total: number;
  percent: number;
  currentCategory: QuestionCategory | null;
  categories: Array<{
    category: QuestionCategory;
    label: string;
    completed: number;
    total: number;
  }>;
}

export interface StartInterviewResponse {
  conversationId: string;
  businessProfileId: string;
  initialMessage: string;
  progress: ProgressInfo;
}

export interface MessageResponse {
  aiResponse: string;
  progress: ProgressInfo;
  isComplete: boolean;
  extractedData?: Record<string, unknown>;
}

export interface InterviewSummary {
  aiSummary: string;
  brandVoice: string;
  recommendations: Array<{
    title: string;
    description: string;
    feature: string;
  }>;
  profile: Record<string, unknown>;
}

@Injectable()
export class OnboardingInterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
    private readonly flowService: InterviewFlowService,
  ) {}

  async getStatus(tenantId: string): Promise<{
    status: OnboardingStatus;
    completedQuestions: number;
    totalQuestions: number;
    percentComplete: number;
    canResume: boolean;
  }> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      return {
        status: OnboardingStatus.NOT_STARTED,
        completedQuestions: 0,
        totalQuestions: this.flowService.getTotalQuestions(),
        percentComplete: 0,
        canResume: false,
      };
    }

    return {
      status: profile.onboardingStatus,
      completedQuestions: profile.completedQuestions,
      totalQuestions: profile.totalQuestions,
      percentComplete: Math.round(
        (profile.completedQuestions / profile.totalQuestions) * 100,
      ),
      canResume: profile.onboardingStatus === OnboardingStatus.IN_PROGRESS,
    };
  }

  async startInterview(
    tenantId: string,
    resume = false,
  ): Promise<StartInterviewResponse> {
    // Get tenant info for personalization
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { businessProfile: { include: { conversation: true } } },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existingProfile = tenant.businessProfile;
    const existingConversation = existingProfile?.conversation;

    // If resuming and we have an in-progress conversation, continue
    if (resume && existingProfile?.onboardingStatus === OnboardingStatus.IN_PROGRESS && existingConversation) {
      const messages = (existingConversation.messages as unknown as InterviewMessage[]) || [];
      const lastAssistantMessage = messages
        .filter(m => m.role === 'assistant')
        .pop();

      return {
        conversationId: existingConversation.id,
        businessProfileId: existingProfile.id,
        initialMessage: lastAssistantMessage?.content || this.flowService.getWelcomeMessage(tenant.name),
        progress: this.getProgress(existingProfile.completedQuestions, existingConversation.currentQuestionId),
      };
    }

    // Create new profile or reset existing
    let profileId: string;
    if (!existingProfile) {
      const newProfile = await this.prisma.businessProfile.create({
        data: {
          tenantId,
          onboardingStatus: OnboardingStatus.IN_PROGRESS,
          totalQuestions: this.flowService.getTotalQuestions(),
        },
      });
      profileId = newProfile.id;
    } else {
      // Reset existing profile for re-run
      await this.prisma.businessProfile.update({
        where: { id: existingProfile.id },
        data: {
          onboardingStatus: OnboardingStatus.IN_PROGRESS,
          completedQuestions: 0,
          completedAt: null,
        },
      });
      profileId = existingProfile.id;
    }

    // Create or reset conversation
    const welcomeMessage = this.flowService.getWelcomeMessage(tenant.name);
    const firstQuestion = this.flowService.getFirstQuestion();

    const initialMessages: InterviewMessage[] = [
      {
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
        questionId: firstQuestion.id,
      },
    ];

    let conversationId: string;
    if (existingConversation) {
      const updated = await this.prisma.onboardingConversation.update({
        where: { id: existingConversation.id },
        data: {
          messages: initialMessages as unknown as Prisma.JsonArray,
          currentQuestionId: firstQuestion.id,
          extractedData: {},
        },
      });
      conversationId = updated.id;
    } else {
      const created = await this.prisma.onboardingConversation.create({
        data: {
          businessProfileId: profileId,
          messages: initialMessages as unknown as Prisma.JsonArray,
          currentQuestionId: firstQuestion.id,
          extractedData: {},
        },
      });
      conversationId = created.id;
    }

    return {
      conversationId,
      businessProfileId: profileId,
      initialMessage: welcomeMessage,
      progress: this.getProgress(0, firstQuestion.id),
    };
  }

  async processMessage(
    tenantId: string,
    conversationId: string,
    userMessage: string,
  ): Promise<MessageResponse> {
    const conversation = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
      include: { businessProfile: { include: { tenant: true } } },
    });

    if (!conversation || conversation.businessProfile.tenantId !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    const profile = conversation.businessProfile;
    const tenant = profile.tenant;
    const messages = (conversation.messages as unknown as InterviewMessage[]) || [];
    const extractedData = (conversation.extractedData as unknown as Record<string, unknown>) || {};
    const currentQuestion = this.flowService.getQuestion(conversation.currentQuestionId || '');

    // Add user message to conversation
    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
      questionId: currentQuestion?.id,
    });

    // Extract data from the user's response
    let newExtractedData: Record<string, unknown> = {};
    if (currentQuestion && currentQuestion.extractFields.length > 0) {
      newExtractedData = await this.extractDataFromResponse(
        currentQuestion.prompt,
        userMessage,
        currentQuestion.extractFields,
        extractedData,
      );
    }

    // Merge extracted data
    const updatedExtractedData = { ...extractedData, ...newExtractedData };

    // Get next question
    const nextQuestion = currentQuestion
      ? this.flowService.getNextQuestion(currentQuestion.id, updatedExtractedData)
      : null;

    const isComplete = !nextQuestion;
    const newCompletedCount = profile.completedQuestions + 1;

    // Generate AI response
    let aiResponse: string;
    if (isComplete) {
      aiResponse = await this.generateCompletionMessage(tenant.name, updatedExtractedData);
    } else {
      aiResponse = await this.generateTransitionMessage(
        tenant.name,
        userMessage,
        currentQuestion?.prompt || '',
        nextQuestion.prompt,
        newCompletedCount,
        this.flowService.getTotalQuestions(),
      );
    }

    // Add AI response to messages
    messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      questionId: nextQuestion?.id,
    });

    // Update conversation
    await this.prisma.onboardingConversation.update({
      where: { id: conversationId },
      data: {
        messages: messages as unknown as Prisma.JsonArray,
        currentQuestionId: nextQuestion?.id || null,
        extractedData: updatedExtractedData as unknown as Prisma.JsonObject,
      },
    });

    // Update profile
    await this.prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        completedQuestions: newCompletedCount,
        onboardingStatus: isComplete ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS,
        completedAt: isComplete ? new Date() : null,
        // Store extracted fields
        ...this.mapExtractedDataToProfile(updatedExtractedData),
      },
    });

    // If complete, generate the AI summary
    if (isComplete) {
      await this.generateAndStoreSummary(profile.id, tenant.name, updatedExtractedData);
    }

    return {
      aiResponse,
      progress: this.getProgress(newCompletedCount, nextQuestion?.id || null),
      isComplete,
      extractedData: newExtractedData,
    };
  }

  async skipQuestion(
    tenantId: string,
    conversationId: string,
  ): Promise<MessageResponse> {
    const conversation = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
      include: { businessProfile: { include: { tenant: true } } },
    });

    if (!conversation || conversation.businessProfile.tenantId !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    const profile = conversation.businessProfile;
    const tenant = profile.tenant;
    const messages = (conversation.messages as unknown as InterviewMessage[]) || [];
    const extractedData = (conversation.extractedData as unknown as Record<string, unknown>) || {};
    const currentQuestion = this.flowService.getQuestion(conversation.currentQuestionId || '');

    // Get next question
    const nextQuestion = currentQuestion
      ? this.flowService.getNextQuestion(currentQuestion.id, extractedData)
      : null;

    const isComplete = !nextQuestion;
    const newCompletedCount = profile.completedQuestions + 1;

    // Generate skip acknowledgment
    let aiResponse: string;
    if (isComplete) {
      aiResponse = await this.generateCompletionMessage(tenant.name, extractedData);
    } else {
      aiResponse = `No problem, we can skip that one. ${nextQuestion.prompt}`;
    }

    messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      questionId: nextQuestion?.id,
    });

    await this.prisma.onboardingConversation.update({
      where: { id: conversationId },
      data: {
        messages: messages as unknown as Prisma.JsonArray,
        currentQuestionId: nextQuestion?.id || null,
      },
    });

    await this.prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        completedQuestions: newCompletedCount,
        onboardingStatus: isComplete ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS,
        completedAt: isComplete ? new Date() : null,
      },
    });

    if (isComplete) {
      await this.generateAndStoreSummary(profile.id, tenant.name, extractedData);
    }

    return {
      aiResponse,
      progress: this.getProgress(newCompletedCount, nextQuestion?.id || null),
      isComplete,
    };
  }

  async completeInterview(
    tenantId: string,
    conversationId: string,
  ): Promise<MessageResponse> {
    const conversation = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
      include: { businessProfile: { include: { tenant: true } } },
    });

    if (!conversation || conversation.businessProfile.tenantId !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    const profile = conversation.businessProfile;
    const tenant = profile.tenant;
    const extractedData = (conversation.extractedData as Record<string, unknown>) || {};

    const aiResponse = await this.generateCompletionMessage(tenant.name, extractedData);

    await this.prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        onboardingStatus: OnboardingStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.generateAndStoreSummary(profile.id, tenant.name, extractedData);

    return {
      aiResponse,
      progress: this.getProgress(profile.completedQuestions, null),
      isComplete: true,
    };
  }

  async getSummary(tenantId: string): Promise<InterviewSummary | null> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
    });

    if (!profile || profile.onboardingStatus !== OnboardingStatus.COMPLETED) {
      return null;
    }

    return {
      aiSummary: profile.aiSummary || '',
      brandVoice: profile.brandVoice || '',
      recommendations: (profile.aiRecommendations as InterviewSummary['recommendations']) || [],
      profile: {
        industry: profile.industry,
        targetMarket: profile.targetMarket,
        serviceArea: profile.serviceArea,
        teamSize: profile.teamSize,
        communicationStyle: profile.communicationStyle,
        primaryGoals: profile.primaryGoals,
        currentChallenges: profile.currentChallenges,
        peakSeasons: profile.peakSeasons,
      },
    };
  }

  async getConversation(tenantId: string): Promise<InterviewMessage[]> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
      include: { conversation: true },
    });

    if (!profile?.conversation) {
      return [];
    }

    return (profile.conversation.messages as unknown as InterviewMessage[]) || [];
  }

  private getProgress(completedQuestions: number, currentQuestionId: string | null): ProgressInfo {
    const total = this.flowService.getTotalQuestions();
    const completedIds: string[] = [];

    // Build list of completed question IDs based on order
    for (let i = 1; i <= completedQuestions; i++) {
      const q = this.flowService.getQuestionByOrder(i);
      if (q) completedIds.push(q.id);
    }

    const currentQuestion = currentQuestionId
      ? this.flowService.getQuestion(currentQuestionId)
      : null;

    return {
      completed: completedQuestions,
      total,
      percent: Math.round((completedQuestions / total) * 100),
      currentCategory: currentQuestion?.category || null,
      categories: this.flowService.getCategoryProgress(completedIds),
    };
  }

  private async extractDataFromResponse(
    questionPrompt: string,
    userAnswer: string,
    fieldsToExtract: string[],
    existingData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.aiEngine.generateText({
        template: 'onboarding.extract-data',
        variables: {
          questionAsked: questionPrompt,
          userAnswer,
          fieldsToExtract: fieldsToExtract.join(', '),
          existingProfile: JSON.stringify(existingData),
        },
        tenantId: 'system',
        feature: 'onboarding-interview',
      });

      // Parse JSON response from .data
      const jsonMatch = response.data.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const extracted: Record<string, unknown> = {};

        if (parsed.extracted) {
          for (const [key, value] of Object.entries(parsed.extracted)) {
            const v = value as { value: unknown; confidence: number };
            if (v.confidence >= 0.7) {
              extracted[key] = v.value;
            }
          }
        }

        return extracted;
      }
    } catch (error) {
      console.error('Failed to extract data:', error);
    }

    return {};
  }

  private async generateTransitionMessage(
    businessName: string,
    userAnswer: string,
    previousQuestion: string,
    nextQuestion: string,
    completedCount: number,
    totalQuestions: number,
  ): Promise<string> {
    try {
      const response = await this.aiEngine.generateText({
        template: 'onboarding.interview',
        variables: {
          businessName,
          userMessage: userAnswer,
          previousQuestion,
          nextQuestion,
          completedQuestions: completedCount.toString(),
          totalQuestions: totalQuestions.toString(),
        },
        tenantId: 'system',
        feature: 'onboarding-interview',
      });
      return response.data;
    } catch (error) {
      console.error('Failed to generate transition:', error);
      return `Got it! ${nextQuestion}`;
    }
  }

  private async generateCompletionMessage(
    businessName: string,
    extractedData: Record<string, unknown>,
  ): Promise<string> {
    const industry = extractedData.industry || 'your industry';
    return `That's everything I need! Based on what you've shared, I now have a great understanding of ${businessName} and how you operate in ${industry}. I'll use this to personalize your experience - from how I communicate with your customers to the suggestions I make.\n\nYou can always update your business profile in Settings if anything changes. Let's get started!`;
  }

  private async generateAndStoreSummary(
    profileId: string,
    businessName: string,
    extractedData: Record<string, unknown>,
  ): Promise<void> {
    try {
      const response = await this.aiEngine.generateText({
        template: 'onboarding.generate-summary',
        variables: {
          businessName,
          interviewData: JSON.stringify(extractedData),
        },
        tenantId: 'system',
        feature: 'onboarding-interview',
      });

      const jsonMatch = response.data.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        await this.prisma.businessProfile.update({
          where: { id: profileId },
          data: {
            aiSummary: parsed.aiSummary || null,
            brandVoice: parsed.brandVoice || null,
            aiRecommendations: parsed.recommendations || [],
          },
        });
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  }

  private mapExtractedDataToProfile(
    data: Record<string, unknown>,
  ): Partial<Prisma.BusinessProfileUpdateInput> {
    const mapping: Partial<Prisma.BusinessProfileUpdateInput> = {};

    if (data.industry) mapping.industry = String(data.industry);
    if (data.businessDescription) mapping.businessDescription = String(data.businessDescription);
    if (data.targetMarket) mapping.targetMarket = String(data.targetMarket);
    if (data.serviceArea) mapping.serviceArea = String(data.serviceArea);
    if (data.serviceAreaRadius) mapping.serviceAreaRadius = Number(data.serviceAreaRadius);
    if (data.teamSize) mapping.teamSize = Number(data.teamSize);
    if (data.hasFieldTechnicians !== undefined) mapping.hasFieldTechnicians = Boolean(data.hasFieldTechnicians);
    if (data.hasOfficeStaff !== undefined) mapping.hasOfficeStaff = Boolean(data.hasOfficeStaff);
    if (data.ownerRole) mapping.ownerRole = String(data.ownerRole);
    if (data.communicationStyle) mapping.communicationStyle = String(data.communicationStyle);
    if (data.preferredChannels) mapping.preferredChannels = data.preferredChannels as string[];
    if (data.primaryGoals) mapping.primaryGoals = data.primaryGoals;
    if (data.currentChallenges) mapping.currentChallenges = data.currentChallenges;
    if (data.growthStage) mapping.growthStage = String(data.growthStage);
    if (data.peakSeasons) mapping.peakSeasons = data.peakSeasons;
    if (data.busyDays) mapping.busyDays = data.busyDays as number[];
    if (data.uniqueSellingPoints) mapping.uniqueSellingPoints = data.uniqueSellingPoints;
    if (data.pricingPosition) mapping.pricingPosition = String(data.pricingPosition);

    return mapping;
  }
}
