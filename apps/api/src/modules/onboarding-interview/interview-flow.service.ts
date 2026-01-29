import { Injectable } from '@nestjs/common';

export interface InterviewQuestion {
  id: string;
  category: QuestionCategory;
  prompt: string;
  extractFields: string[];
  required: boolean;
  order: number;
  // Conditional logic for adaptive questions
  condition?: (extractedData: Record<string, unknown>) => boolean;
}

export enum QuestionCategory {
  IDENTITY = 'identity',
  MARKET = 'market',
  TEAM = 'team',
  SERVICES = 'services',
  COMMUNICATION = 'communication',
  GOALS = 'goals',
  PATTERNS = 'patterns',
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  [QuestionCategory.IDENTITY]: 'Identity',
  [QuestionCategory.MARKET]: 'Market',
  [QuestionCategory.TEAM]: 'Team',
  [QuestionCategory.SERVICES]: 'Services',
  [QuestionCategory.COMMUNICATION]: 'Communication',
  [QuestionCategory.GOALS]: 'Goals',
  [QuestionCategory.PATTERNS]: 'Patterns',
};

@Injectable()
export class InterviewFlowService {
  private readonly questions: InterviewQuestion[] = [
    // Identity (2 questions)
    {
      id: 'industry',
      category: QuestionCategory.IDENTITY,
      prompt: "What type of business do you run?",
      extractFields: ['industry'],
      required: true,
      order: 1,
    },
    {
      id: 'description',
      category: QuestionCategory.IDENTITY,
      prompt: "Tell me what makes your business special. What do you want customers to know about you?",
      extractFields: ['businessDescription', 'uniqueSellingPoints'],
      required: true,
      order: 2,
    },
    // Market (2 questions)
    {
      id: 'target_market',
      category: QuestionCategory.MARKET,
      prompt: "Who are your typical customers - mostly homeowners, businesses, or a mix of both?",
      extractFields: ['targetMarket'],
      required: true,
      order: 3,
    },
    {
      id: 'service_area',
      category: QuestionCategory.MARKET,
      prompt: "What area do you serve? Are you focused on a specific city or region, or do you travel further out?",
      extractFields: ['serviceArea', 'serviceAreaRadius'],
      required: true,
      order: 4,
    },
    // Team (2 questions)
    {
      id: 'team_size',
      category: QuestionCategory.TEAM,
      prompt: "How big is your team right now? Is it just you, or do you have employees?",
      extractFields: ['teamSize', 'hasFieldTechnicians', 'hasOfficeStaff'],
      required: true,
      order: 5,
    },
    {
      id: 'owner_role',
      category: QuestionCategory.TEAM,
      prompt: "What's your role day-to-day - are you mostly in the field doing the work, running the office, or a mix of both?",
      extractFields: ['ownerRole'],
      required: true,
      order: 6,
    },
    // Services (1 question - validates existing)
    {
      id: 'services',
      category: QuestionCategory.SERVICES,
      prompt: "What are the main services you offer? Feel free to list your top few.",
      extractFields: [],
      required: true,
      order: 7,
    },
    // Communication (2 questions)
    {
      id: 'communication_style',
      category: QuestionCategory.COMMUNICATION,
      prompt: "How do you like to communicate with customers - more professional and formal, or friendly and casual?",
      extractFields: ['communicationStyle'],
      required: true,
      order: 8,
    },
    {
      id: 'preferred_channels',
      category: QuestionCategory.COMMUNICATION,
      prompt: "How do your customers usually prefer to reach you - text, phone calls, or email?",
      extractFields: ['preferredChannels'],
      required: true,
      order: 9,
    },
    // Goals (2 questions)
    {
      id: 'goals',
      category: QuestionCategory.GOALS,
      prompt: "What are your main business goals right now? Growing revenue, getting more customers, improving efficiency, or something else?",
      extractFields: ['primaryGoals', 'growthStage'],
      required: true,
      order: 10,
    },
    {
      id: 'challenges',
      category: QuestionCategory.GOALS,
      prompt: "What's your biggest challenge at the moment? What keeps you up at night about the business?",
      extractFields: ['currentChallenges'],
      required: true,
      order: 11,
    },
    // Patterns (1 question)
    {
      id: 'seasonal',
      category: QuestionCategory.PATTERNS,
      prompt: "Does your business have busy seasons? When are your peak times and when are things slower?",
      extractFields: ['peakSeasons', 'busyDays'],
      required: true,
      order: 12,
    },
  ];

  getTotalQuestions(): number {
    return this.questions.length;
  }

  getQuestion(questionId: string): InterviewQuestion | undefined {
    return this.questions.find(q => q.id === questionId);
  }

  getQuestionByOrder(order: number): InterviewQuestion | undefined {
    return this.questions.find(q => q.order === order);
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
      .filter(q => q.order > currentQuestion.order)
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
  ): Array<{ category: QuestionCategory; label: string; completed: number; total: number }> {
    const categories = this.getCategories();

    return categories.map(category => {
      const categoryQuestions = this.questions.filter(q => q.category === category);
      const completed = categoryQuestions.filter(q =>
        completedQuestionIds.includes(q.id)
      ).length;

      return {
        category,
        label: CATEGORY_LABELS[category],
        completed,
        total: categoryQuestions.length,
      };
    });
  }

  getWelcomeMessage(businessName: string): string {
    return `Welcome! I'm excited to learn about ${businessName || 'your business'} so I can personalize everything for you. This will only take about 5 minutes, and you can skip any questions you're not ready to answer.\n\nLet's start - ${this.getFirstQuestion().prompt}`;
  }
}
