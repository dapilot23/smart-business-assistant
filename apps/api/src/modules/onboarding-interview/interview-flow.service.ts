import { Injectable } from '@nestjs/common';

export interface InterviewQuestion {
  id: string;
  category: QuestionCategory;
  prompt: string;
  // Fields this question directly extracts
  extractFields: string[];
  // Fields that can be inferred from the response
  inferFields: string[];
  required: boolean;
  order: number;
  // Conditional logic for adaptive questions
  condition?: (extractedData: Record<string, unknown>) => boolean;
}

export interface AdaptiveQuestion {
  id: string;
  condition: (profile: Record<string, unknown>) => boolean;
  prompt: string;
  extractFields: string[];
  priority: number;
}

export enum QuestionCategory {
  BUSINESS = 'business',
  OPERATIONS = 'operations',
  GOALS = 'goals',
  COMPETITION = 'competition',
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  [QuestionCategory.BUSINESS]: 'Business',
  [QuestionCategory.OPERATIONS]: 'Operations',
  [QuestionCategory.GOALS]: 'Goals',
  [QuestionCategory.COMPETITION]: 'Competition',
};

@Injectable()
export class InterviewFlowService {
  // 8 Smart Questions - designed to extract multiple fields per question
  private readonly questions: InterviewQuestion[] = [
    // Question 1: Business Identity
    {
      id: 'business_intro',
      category: QuestionCategory.BUSINESS,
      prompt:
        "Tell me about your business in a sentence or two - what do you do and who do you serve?",
      extractFields: ['industry', 'businessDescription', 'targetMarket'],
      inferFields: ['yearsInBusiness', 'teamSize', 'growthStage'],
      required: true,
      order: 1,
    },

    // Question 2: Location & Service Area
    {
      id: 'location',
      category: QuestionCategory.BUSINESS,
      prompt:
        "Where are you based and how far do you typically travel for jobs?",
      extractFields: ['serviceArea', 'serviceAreaRadius'],
      inferFields: ['timezone'],
      required: true,
      order: 2,
    },

    // Question 3: Operations & Volume
    {
      id: 'operations',
      category: QuestionCategory.OPERATIONS,
      prompt:
        "Walk me through a typical week - how many jobs do you handle and what kind of work fills your schedule?",
      extractFields: ['jobsPerWeek', 'teamSize'],
      inferFields: ['averageJobValue', 'peakSeasons', 'hasFieldTechnicians'],
      required: true,
      order: 3,
    },

    // Question 4: Customer Acquisition
    {
      id: 'customers',
      category: QuestionCategory.OPERATIONS,
      prompt:
        "How do your best customers usually find you and get in touch?",
      extractFields: ['leadSources', 'topLeadSource', 'preferredChannels'],
      inferFields: ['communicationStyle'],
      required: true,
      order: 4,
    },

    // Question 5: Business Health
    {
      id: 'business_health',
      category: QuestionCategory.GOALS,
      prompt:
        "What's working really well right now, and what would you change if you could?",
      extractFields: ['primaryGoals', 'currentChallenges'],
      inferFields: ['growthStage', 'revenueRange'],
      required: true,
      order: 5,
    },

    // Question 6: Competition
    {
      id: 'competition',
      category: QuestionCategory.COMPETITION,
      prompt:
        "Who are your main competitors and why do customers typically pick you over them?",
      extractFields: [
        'knownCompetitors',
        'winReasons',
        'uniqueSellingPoints',
      ],
      inferFields: ['competitiveAdvantage', 'marketPosition'],
      required: true,
      order: 6,
    },

    // Question 7: Pricing
    {
      id: 'pricing',
      category: QuestionCategory.OPERATIONS,
      prompt:
        "Roughly what's your average job worth, and how do you usually price - flat rate, hourly, or depends on the job?",
      extractFields: ['averageJobValue', 'pricingModel'],
      inferFields: ['pricingPosition', 'revenueRange'],
      required: true,
      order: 7,
    },

    // Question 8: Vision
    {
      id: 'vision',
      category: QuestionCategory.GOALS,
      prompt:
        "Where do you want the business to be a year from now?",
      extractFields: ['revenueGoal', 'primaryGoals'],
      inferFields: ['growthStage'],
      required: true,
      order: 8,
    },
  ];

  // Adaptive follow-up questions based on extracted data
  private readonly adaptiveQuestions: AdaptiveQuestion[] = [
    {
      id: 'emergency_services',
      condition: (p) =>
        p.industry === 'hvac' ||
        p.industry === 'plumbing' ||
        p.industry === 'electrical',
      prompt:
        "Do you handle emergency calls after hours? What's your typical response time?",
      extractFields: ['emergencyService', 'avgResponseTime'],
      priority: 8,
    },
    {
      id: 'team_dispatch',
      condition: (p) => typeof p.teamSize === 'number' && p.teamSize > 3,
      prompt: 'How do you typically assign jobs to your team?',
      extractFields: ['dispatchMethod', 'hasDispatcher'],
      priority: 6,
    },
    {
      id: 'commercial_verticals',
      condition: (p) =>
        p.targetMarket === 'commercial' || p.targetMarket === 'both',
      prompt: 'What types of commercial clients do you work with most?',
      extractFields: ['commercialVerticals'],
      priority: 5,
    },
    {
      id: 'current_tools',
      condition: (p) =>
        !p.currentTools || (p.currentTools as string[]).length === 0,
      prompt:
        "Are you using any software to manage jobs, or is it mostly manual right now?",
      extractFields: ['currentTools', 'techSavvy'],
      priority: 7,
    },
    {
      id: 'repeat_business',
      condition: (p) => p.repeatCustomerPercent === undefined,
      prompt:
        "About what percentage of your work comes from repeat customers?",
      extractFields: ['repeatCustomerPercent'],
      priority: 4,
    },
    {
      id: 'seasonal_patterns',
      condition: (p) => !p.peakSeasons,
      prompt:
        "Are there certain times of year that are busier or slower for you?",
      extractFields: ['peakSeasons', 'slowSeasons'],
      priority: 3,
    },
  ];

  getTotalQuestions(): number {
    return this.questions.length;
  }

  getQuestion(questionId: string): InterviewQuestion | undefined {
    return this.questions.find((q) => q.id === questionId);
  }

  getQuestionByOrder(order: number): InterviewQuestion | undefined {
    return this.questions.find((q) => q.order === order);
  }

  getFirstQuestion(): InterviewQuestion {
    return this.questions[0];
  }

  getNextQuestion(
    currentQuestionId: string,
    extractedData: Record<string, unknown>,
  ): InterviewQuestion | null {
    const currentQuestion = this.getQuestion(currentQuestionId);
    if (!currentQuestion) return null;

    // Find the next question in order
    const candidateQuestions = this.questions
      .filter((q) => q.order > currentQuestion.order)
      .sort((a, b) => a.order - b.order);

    for (const question of candidateQuestions) {
      // Check if question has a condition and evaluate it
      if (question.condition && !question.condition(extractedData)) {
        continue;
      }
      return question;
    }

    return null; // No more questions
  }

  /**
   * Get applicable adaptive questions based on current profile
   * Returns up to 2 most relevant follow-up questions
   */
  getAdaptiveQuestions(
    extractedData: Record<string, unknown>,
    maxQuestions = 2,
  ): AdaptiveQuestion[] {
    return this.adaptiveQuestions
      .filter((q) => q.condition(extractedData))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxQuestions);
  }

  getAllQuestions(): InterviewQuestion[] {
    return [...this.questions].sort((a, b) => a.order - b.order);
  }

  getCategories(): QuestionCategory[] {
    const seen = new Set<QuestionCategory>();
    const categories: QuestionCategory[] = [];

    for (const q of this.questions) {
      if (!seen.has(q.category)) {
        seen.add(q.category);
        categories.push(q.category);
      }
    }

    return categories;
  }

  getCategoryProgress(
    completedQuestionIds: string[],
  ): Array<{
    category: QuestionCategory;
    label: string;
    completed: number;
    total: number;
  }> {
    const categories = this.getCategories();

    return categories.map((category) => {
      const categoryQuestions = this.questions.filter(
        (q) => q.category === category,
      );
      const completed = categoryQuestions.filter((q) =>
        completedQuestionIds.includes(q.id),
      ).length;

      return {
        category,
        label: CATEGORY_LABELS[category],
        completed,
        total: categoryQuestions.length,
      };
    });
  }

  /**
   * Get all fields that should be extracted for a question
   * Includes both direct extract fields and inferrable fields
   */
  getTargetFields(questionId: string): string[] {
    const question = this.getQuestion(questionId);
    if (!question) return [];
    return [...question.extractFields, ...question.inferFields];
  }

  getWelcomeMessage(businessName: string): string {
    const name = businessName || 'your business';
    return `Hi! I'm here to learn about ${name} so I can help you grow and work smarter. This takes about 3-4 minutes - just 8 questions.\n\nLet's dive in! ${this.getFirstQuestion().prompt}`;
  }

  /**
   * Generate a contextual transition message hint
   */
  getTransitionHint(
    currentQuestionId: string,
    extractedData: Record<string, unknown>,
  ): string | null {
    const question = this.getQuestion(currentQuestionId);
    if (!question) return null;

    // Generate hints based on what we've learned
    switch (question.id) {
      case 'business_intro':
        if (extractedData.industry) {
          return `Got it - ${extractedData.industry} business!`;
        }
        break;
      case 'operations':
        if (extractedData.teamSize) {
          return `Nice, a team of ${extractedData.teamSize}!`;
        }
        break;
      case 'pricing':
        if (extractedData.averageJobValue) {
          return `$${extractedData.averageJobValue} average - solid!`;
        }
        break;
    }

    return null;
  }
}
