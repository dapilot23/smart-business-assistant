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
  BASICS = 'basics',
  FINANCIALS = 'financials',
  CUSTOMERS = 'customers',
  OPERATIONS = 'operations',
  MARKETING = 'marketing',
  GOALS = 'goals',
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  [QuestionCategory.BASICS]: 'Basics',
  [QuestionCategory.FINANCIALS]: 'Financials',
  [QuestionCategory.CUSTOMERS]: 'Customers',
  [QuestionCategory.OPERATIONS]: 'Operations',
  [QuestionCategory.MARKETING]: 'Marketing',
  [QuestionCategory.GOALS]: 'Goals',
};

@Injectable()
export class InterviewFlowService {
  private readonly questions: InterviewQuestion[] = [
    // BASICS (3 questions)
    {
      id: 'industry',
      category: QuestionCategory.BASICS,
      prompt: "What type of business do you run? (e.g., plumbing, HVAC, landscaping, electrical, cleaning, etc.)",
      extractFields: ['industry'],
      required: true,
      order: 1,
    },
    {
      id: 'years_in_business',
      category: QuestionCategory.BASICS,
      prompt: "How long have you been in business?",
      extractFields: ['yearsInBusiness'],
      required: true,
      order: 2,
    },
    {
      id: 'description',
      category: QuestionCategory.BASICS,
      prompt: "What makes your business different from competitors? What should customers know about you?",
      extractFields: ['businessDescription', 'uniqueSellingPoints'],
      required: true,
      order: 3,
    },

    // FINANCIALS (3 questions)
    {
      id: 'revenue',
      category: QuestionCategory.FINANCIALS,
      prompt: "Roughly what's your annual revenue? (e.g., under $100K, $100K-$500K, $500K-$1M, $1M-$5M, $5M+). This helps me tailor advice to your business size.",
      extractFields: ['revenueRange'],
      required: true,
      order: 4,
    },
    {
      id: 'average_job',
      category: QuestionCategory.FINANCIALS,
      prompt: "What's your average job or ticket value? (e.g., $150, $500, $2000)",
      extractFields: ['averageJobValue'],
      required: true,
      order: 5,
    },
    {
      id: 'pricing_model',
      category: QuestionCategory.FINANCIALS,
      prompt: "How do you typically price jobs - flat rate, hourly, or a mix? Do you feel your prices are competitive, premium, or budget-friendly?",
      extractFields: ['pricingModel', 'pricingPosition'],
      required: true,
      order: 6,
    },

    // CUSTOMERS (3 questions)
    {
      id: 'target_market',
      category: QuestionCategory.CUSTOMERS,
      prompt: "Who are your typical customers - mostly homeowners (residential), businesses (commercial), or a mix of both?",
      extractFields: ['targetMarket'],
      required: true,
      order: 7,
    },
    {
      id: 'service_area',
      category: QuestionCategory.CUSTOMERS,
      prompt: "What area do you serve? (city, county, radius in miles)",
      extractFields: ['serviceArea', 'serviceAreaRadius'],
      required: true,
      order: 8,
    },
    {
      id: 'repeat_customers',
      category: QuestionCategory.CUSTOMERS,
      prompt: "What percentage of your work comes from repeat customers vs. new customers?",
      extractFields: ['repeatCustomerPercent'],
      required: true,
      order: 9,
    },

    // OPERATIONS (3 questions)
    {
      id: 'team_size',
      category: QuestionCategory.OPERATIONS,
      prompt: "How big is your team? (just you, 2-5, 6-10, 11-25, 25+)",
      extractFields: ['teamSize', 'hasFieldTechnicians', 'hasOfficeStaff'],
      required: true,
      order: 10,
    },
    {
      id: 'jobs_per_week',
      category: QuestionCategory.OPERATIONS,
      prompt: "How many jobs or appointments do you typically complete per week?",
      extractFields: ['jobsPerWeek'],
      required: true,
      order: 11,
    },
    {
      id: 'current_tools',
      category: QuestionCategory.OPERATIONS,
      prompt: "What tools or software do you currently use to run your business? (scheduling, invoicing, CRM, etc. - or just pen and paper?)",
      extractFields: ['currentTools'],
      required: true,
      order: 12,
    },

    // MARKETING (2 questions)
    {
      id: 'lead_sources',
      category: QuestionCategory.MARKETING,
      prompt: "How do most of your customers find you? (word of mouth, Google, social media, Yelp, Home Advisor, ads, etc.)",
      extractFields: ['leadSources', 'topLeadSource'],
      required: true,
      order: 13,
    },
    {
      id: 'communication_style',
      category: QuestionCategory.MARKETING,
      prompt: "How do you prefer to communicate with customers - professional and formal, or friendly and casual? Do they usually reach you by phone, text, or email?",
      extractFields: ['communicationStyle', 'preferredChannels'],
      required: true,
      order: 14,
    },

    // GOALS (2 questions)
    {
      id: 'challenges',
      category: QuestionCategory.GOALS,
      prompt: "What's your biggest challenge right now? What keeps you up at night about the business?",
      extractFields: ['currentChallenges'],
      required: true,
      order: 15,
    },
    {
      id: 'goals',
      category: QuestionCategory.GOALS,
      prompt: "Where do you want your business to be in 2-3 years? Any specific goals like revenue targets, team size, or new services?",
      extractFields: ['primaryGoals', 'growthStage', 'revenueGoal'],
      required: true,
      order: 16,
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
    return `Hi! I'm here to learn about ${businessName || 'your business'} so I can help you grow and run things more smoothly. This takes about 5-7 minutes.\n\nLet's start with the basics - ${this.getFirstQuestion().prompt}`;
  }
}
