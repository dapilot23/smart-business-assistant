import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { AutoResponderRule, MessageIntent, MessageSentiment } from '@prisma/client';
import { ClassificationResult } from './message-classification.service';

export interface ResponseSuggestion {
  content: string;
  confidence: number;
  tone: 'professional' | 'friendly' | 'empathetic';
  includesActionItem: boolean;
}

export interface AutoResponderMatch {
  rule: AutoResponderRule;
  generatedResponse: string;
}

export interface CreateAutoResponderRuleDto {
  name: string;
  intent?: MessageIntent;
  sentiment?: MessageSentiment;
  minUrgency?: number;
  maxUrgency?: number;
  responseTemplate: string;
  isActive?: boolean;
  priority?: number;
}

export interface UpdateAutoResponderRuleDto {
  name?: string;
  intent?: MessageIntent;
  sentiment?: MessageSentiment;
  minUrgency?: number;
  maxUrgency?: number;
  responseTemplate?: string;
  isActive?: boolean;
  priority?: number;
}

const TONES: Array<'professional' | 'friendly' | 'empathetic'> = [
  'professional',
  'friendly',
  'empathetic',
];

@Injectable()
export class ResponseGenerationService {
  private readonly logger = new Logger(ResponseGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
  ) {}

  async generateResponseSuggestions(
    conversationId: string,
    tenantId: string,
    count = 3,
  ): Promise<ResponseSuggestion[]> {
    const conversation = await this.prisma.conversationThread.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 10 } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const lastMessages = conversation.messages
      .map((m) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n');

    const suggestions: ResponseSuggestion[] = [];
    const tonesToUse = TONES.slice(0, count);

    for (const tone of tonesToUse) {
      try {
        if (this.aiEngine.isReady()) {
          const response = await this.aiEngine.generateText({
            template: 'comms.generate-response',
            variables: {
              messageText: lastMessages,
              customerName: conversation.customerName || 'Customer',
              customerContext: 'No additional context',
              businessServices: 'General services',
              availableSlots: 'Contact us for availability',
              businessName: tenant?.name || 'Our Business',
              businessHours: '9am-5pm Mon-Fri',
            },
            tenantId,
            feature: 'communication',
            tone,
          });

          suggestions.push({
            content: response.data as string,
            confidence: 0.85,
            tone,
            includesActionItem: this.detectActionItem(response.data as string),
          });
        } else {
          // Fallback when AI is not available
          suggestions.push(this.generateFallbackResponse(tone, conversation.customerName));
        }
      } catch (error) {
        this.logger.warn(`Failed to generate ${tone} response: ${error.message}`);
        suggestions.push(this.generateFallbackResponse(tone, conversation.customerName));
      }
    }

    return suggestions;
  }

  async findMatchingAutoResponder(
    classification: ClassificationResult,
    tenantId: string,
  ): Promise<AutoResponderMatch | null> {
    const rules = await this.prisma.autoResponderRule.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    for (const rule of rules) {
      if (this.ruleMatches(rule, classification)) {
        const generatedResponse = this.personalizeTemplate(
          rule.responseTemplate,
          classification,
        );
        return { rule, generatedResponse };
      }
    }

    return null;
  }

  async createAutoResponderRule(
    data: CreateAutoResponderRuleDto,
    tenantId: string,
  ): Promise<AutoResponderRule> {
    return this.prisma.autoResponderRule.create({
      data: {
        tenantId,
        name: data.name,
        intent: data.intent ?? null,
        sentiment: data.sentiment ?? null,
        minUrgency: data.minUrgency ?? 0,
        maxUrgency: data.maxUrgency ?? 100,
        responseTemplate: data.responseTemplate,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
      },
    });
  }

  async updateAutoResponderRule(
    id: string,
    data: UpdateAutoResponderRuleDto,
    tenantId: string,
  ): Promise<AutoResponderRule> {
    return this.prisma.autoResponderRule.update({
      where: { id, tenantId },
      data,
    });
  }

  async deleteAutoResponderRule(id: string, tenantId: string): Promise<void> {
    await this.prisma.autoResponderRule.delete({
      where: { id, tenantId },
    });
  }

  async getAutoResponderRules(tenantId: string): Promise<AutoResponderRule[]> {
    return this.prisma.autoResponderRule.findMany({
      where: { tenantId },
      orderBy: { priority: 'desc' },
    });
  }

  private ruleMatches(
    rule: AutoResponderRule,
    classification: ClassificationResult,
  ): boolean {
    // Check intent match (null means any intent)
    if (rule.intent !== null && rule.intent !== classification.intent) {
      return false;
    }

    // Check sentiment match (null means any sentiment)
    if (rule.sentiment !== null && rule.sentiment !== classification.sentiment) {
      return false;
    }

    // Check urgency range
    if (
      classification.urgencyScore < rule.minUrgency ||
      classification.urgencyScore > rule.maxUrgency
    ) {
      return false;
    }

    return true;
  }

  private personalizeTemplate(
    template: string,
    classification: ClassificationResult,
  ): string {
    // Simple template personalization
    return template
      .replace('{intent}', classification.intent)
      .replace('{sentiment}', classification.sentiment)
      .replace('{urgency}', classification.urgencyScore.toString());
  }

  private detectActionItem(content: string): boolean {
    const actionKeywords = [
      'schedule',
      'book',
      'call',
      'visit',
      'contact',
      'click',
      'reply',
      'let me know',
      'please',
      '?',
    ];
    const lowerContent = content.toLowerCase();
    return actionKeywords.some((kw) => lowerContent.includes(kw));
  }

  private generateFallbackResponse(
    tone: 'professional' | 'friendly' | 'empathetic',
    customerName?: string | null,
  ): ResponseSuggestion {
    const name = customerName || 'there';
    let content: string;

    switch (tone) {
      case 'professional':
        content = `Thank you for your message. We will review your inquiry and respond shortly.`;
        break;
      case 'friendly':
        content = `Hi ${name}! Thanks for reaching out. How can we help you today?`;
        break;
      case 'empathetic':
        content = `We appreciate you contacting us, ${name}. We understand and are here to help.`;
        break;
    }

    return {
      content,
      confidence: 0.5,
      tone,
      includesActionItem: false,
    };
  }
}
