import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { InterviewFlowService, QuestionCategory } from './interview-flow.service';
import { InferenceEngineService, InferenceResult } from './inference-engine.service';
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

export interface StreamMessageResponse {
  aiResponse: string;
  progress: ProgressInfo;
  isComplete: boolean;
  nextQuestion?: { id: string; text: string } | null;
  extractedData?: Record<string, unknown>;
  inferredCount?: number;
}

@Injectable()
export class OnboardingInterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
    private readonly flowService: InterviewFlowService,
    private readonly inferenceEngine: InferenceEngineService,
  ) {}

  /**
   * Gets the demo tenant ID for demo mode
   * Returns null if demo tenant doesn't exist
   */
  async getDemoTenantId(): Promise<string | null> {
    const demoTenant = await this.prisma.tenant.findUnique({
      where: { slug: 'demo-plumbing' },
    });
    return demoTenant?.id || null;
  }

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
          interviewCompletedAt: null,
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
        interviewCompletedAt: isComplete ? new Date() : null,
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
        interviewCompletedAt: isComplete ? new Date() : null,
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
        interviewCompletedAt: new Date(),
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

    // Business Identity
    if (data.industry) mapping.industry = String(data.industry);
    if (data.yearsInBusiness) mapping.yearsInBusiness = Number(data.yearsInBusiness);
    if (data.businessDescription) mapping.businessDescription = String(data.businessDescription);
    if (data.targetMarket) mapping.targetMarket = String(data.targetMarket);
    if (data.serviceArea) mapping.serviceArea = String(data.serviceArea);
    if (data.serviceAreaRadius) mapping.serviceAreaRadius = Number(data.serviceAreaRadius);

    // Financials
    if (data.revenueRange) mapping.revenueRange = String(data.revenueRange);
    if (data.averageJobValue) mapping.averageJobValue = data.averageJobValue;
    if (data.pricingModel) mapping.pricingModel = String(data.pricingModel);

    // Customers
    if (data.repeatCustomerPercent) mapping.repeatCustomerPercent = Number(data.repeatCustomerPercent);

    // Team & Operations
    if (data.teamSize) mapping.teamSize = Number(data.teamSize);
    if (data.hasFieldTechnicians !== undefined) mapping.hasFieldTechnicians = Boolean(data.hasFieldTechnicians);
    if (data.hasOfficeStaff !== undefined) mapping.hasOfficeStaff = Boolean(data.hasOfficeStaff);
    if (data.ownerRole) mapping.ownerRole = String(data.ownerRole);
    if (data.jobsPerWeek) mapping.jobsPerWeek = Number(data.jobsPerWeek);
    if (data.currentTools) mapping.currentTools = data.currentTools;

    // Marketing & Lead Sources
    if (data.leadSources) mapping.leadSources = data.leadSources;
    if (data.topLeadSource) mapping.topLeadSource = String(data.topLeadSource);

    // Communication & Brand
    if (data.communicationStyle) mapping.communicationStyle = String(data.communicationStyle);
    if (data.preferredChannels) mapping.preferredChannels = data.preferredChannels as string[];

    // Business Goals
    if (data.primaryGoals) mapping.primaryGoals = data.primaryGoals;
    if (data.currentChallenges) mapping.currentChallenges = data.currentChallenges;
    if (data.growthStage) mapping.growthStage = String(data.growthStage);
    if (data.revenueGoal) mapping.revenueGoal = String(data.revenueGoal);

    // Seasonal Patterns
    if (data.peakSeasons) mapping.peakSeasons = data.peakSeasons;
    if (data.busyDays) mapping.busyDays = data.busyDays as number[];

    // Competitive Position
    if (data.uniqueSellingPoints) mapping.uniqueSellingPoints = data.uniqueSellingPoints;
    if (data.pricingPosition) mapping.pricingPosition = String(data.pricingPosition);

    // New fields from Business DNA schema
    if (data.knownCompetitors) mapping.knownCompetitors = data.knownCompetitors;
    if (data.winReasons) mapping.winReasons = data.winReasons;
    if (data.loseReasons) mapping.loseReasons = data.loseReasons;
    if (data.competitiveAdvantage) mapping.competitiveAdvantage = String(data.competitiveAdvantage);
    if (data.marketPosition) mapping.marketPosition = String(data.marketPosition);
    if (data.slowSeasons) mapping.slowSeasons = data.slowSeasons;
    if (data.timezone) mapping.timezone = String(data.timezone);

    return mapping;
  }

  /**
   * Process message with streaming callbacks for real-time updates
   */
  async processMessageWithStream(
    tenantId: string,
    conversationId: string,
    userMessage: string,
    onTextChunk: (chunk: string) => void,
    onExtraction: (extraction: { field: string; value: unknown; confidence: number }) => void,
  ): Promise<StreamMessageResponse> {
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

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
      questionId: currentQuestion?.id,
    });

    // Extract data using inference engine
    let newExtractedData: Record<string, unknown> = {};
    let inferences: InferenceResult[] = [];

    if (currentQuestion) {
      const targetFields = this.flowService.getTargetFields(currentQuestion.id);

      inferences = await this.inferenceEngine.extractWithInference({
        questionId: currentQuestion.id,
        userResponse: userMessage,
        targetFields,
        existingData: extractedData,
        industry: extractedData.industry as string | undefined,
      });

      // Emit extraction events for each field
      for (const inference of inferences) {
        if (inference.confidence >= 0.6) {
          newExtractedData[inference.field] = inference.value;
          onExtraction({
            field: inference.field,
            value: inference.value,
            confidence: inference.confidence,
          });
        }
      }
    }

    // Merge extracted data
    const updatedExtractedData = { ...extractedData, ...newExtractedData };

    // Get next question
    const nextQuestion = currentQuestion
      ? this.flowService.getNextQuestion(currentQuestion.id, updatedExtractedData)
      : null;

    const isComplete = !nextQuestion;
    const newCompletedCount = profile.completedQuestions + 1;

    // Generate AI response with streaming
    let aiResponse = '';

    if (isComplete) {
      aiResponse = await this.generateCompletionMessage(tenant.name, updatedExtractedData);
    } else {
      // Stream the response
      aiResponse = await this.generateTransitionMessageStreaming(
        tenant.name,
        userMessage,
        currentQuestion?.prompt || '',
        nextQuestion.prompt,
        newCompletedCount,
        this.flowService.getTotalQuestions(),
        onTextChunk,
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

    // Calculate profile completeness based on extracted fields
    const profileCompleteness = this.calculateProfileCompleteness(updatedExtractedData);
    const profileConfidence = this.calculateProfileConfidence(inferences);

    // Update profile
    await this.prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        completedQuestions: newCompletedCount,
        onboardingStatus: isComplete ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS,
        interviewCompletedAt: isComplete ? new Date() : null,
        profileCompleteness,
        profileConfidence,
        ...this.mapExtractedDataToProfile(updatedExtractedData),
      },
    });

    // If complete, generate summary
    if (isComplete) {
      await this.generateAndStoreSummary(profile.id, tenant.name, updatedExtractedData);
    }

    return {
      aiResponse,
      progress: this.getProgress(newCompletedCount, nextQuestion?.id || null),
      isComplete,
      nextQuestion: nextQuestion ? { id: nextQuestion.id, text: nextQuestion.prompt } : null,
      extractedData: newExtractedData,
      inferredCount: inferences.filter(i => i.source === 'inferred').length,
    };
  }

  /**
   * Generate transition message with streaming support
   */
  private async generateTransitionMessageStreaming(
    businessName: string,
    userAnswer: string,
    previousQuestion: string,
    nextQuestion: string,
    completedCount: number,
    totalQuestions: number,
    onChunk: (chunk: string) => void,
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

      // Simulate streaming by chunking the response
      const text = response.data;
      const words = text.split(' ');
      let result = '';

      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        result += chunk;
        onChunk(chunk);
        // Small delay for realistic streaming effect
        await new Promise((r) => setTimeout(r, 20));
      }

      return result;
    } catch (error) {
      const fallback = `Got it! ${nextQuestion}`;
      onChunk(fallback);
      return fallback;
    }
  }

  /**
   * Calculate profile completeness based on filled fields
   */
  private calculateProfileCompleteness(data: Record<string, unknown>): number {
    const coreFields = [
      'industry',
      'targetMarket',
      'serviceArea',
      'teamSize',
      'jobsPerWeek',
      'averageJobValue',
      'pricingModel',
      'leadSources',
      'communicationStyle',
      'primaryGoals',
      'currentChallenges',
      'uniqueSellingPoints',
    ];

    const filled = coreFields.filter(
      (f) => data[f] !== undefined && data[f] !== null && data[f] !== '',
    ).length;

    return filled / coreFields.length;
  }

  /**
   * Calculate overall profile confidence from inferences
   */
  private calculateProfileConfidence(inferences: InferenceResult[]): number {
    if (inferences.length === 0) return 0;

    const totalConfidence = inferences.reduce((sum, i) => sum + i.confidence, 0);
    return totalConfidence / inferences.length;
  }

  /**
   * Get industry benchmarks for the tenant's industry
   */
  async getIndustryBenchmarks(tenantId: string): Promise<{
    industry: string;
    benchmarks: Record<string, unknown>;
    comparison: Record<string, { value: unknown; benchmark: unknown; status: string }>;
  } | null> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
    });

    if (!profile || !profile.industry) {
      return null;
    }

    // Get industry template
    const template = await this.prisma.industryTemplate.findUnique({
      where: { industrySlug: profile.industry },
    });

    if (!template) {
      // Return basic benchmarks without template
      return {
        industry: profile.industry,
        benchmarks: {},
        comparison: {},
      };
    }

    // Build comparison
    const comparison: Record<string, { value: unknown; benchmark: unknown; status: string }> = {};

    if (profile.averageJobValue && template.avgJobValueResidential) {
      const value = Number(profile.averageJobValue);
      const benchmark = Number(template.avgJobValueResidential);
      comparison.averageJobValue = {
        value,
        benchmark,
        status: value >= benchmark ? 'above' : value >= benchmark * 0.8 ? 'at' : 'below',
      };
    }

    if (profile.teamSize && template.typicalTeamSize) {
      const typicalSize = template.typicalTeamSize as { small?: number; medium?: number };
      const benchmark = typicalSize.small || 3;
      comparison.teamSize = {
        value: profile.teamSize,
        benchmark,
        status: 'at', // Team size is contextual
      };
    }

    return {
      industry: profile.industry,
      benchmarks: (template.benchmarkData as Record<string, unknown>) || {},
      comparison,
    };
  }
}
