import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { MessageSentiment } from '@prisma/client';

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  customerSentiment: MessageSentiment;
  unresolvedIssues: string[];
  recommendedActions: string[];
  messageCount: number;
  timeSpan: { start: Date; end: Date };
}

interface AiSummaryResponse {
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  customerSentiment: string;
  followUpNeeded: boolean;
}

@Injectable()
export class ConversationSummaryService {
  private readonly logger = new Logger(ConversationSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
  ) {}

  async summarizeConversation(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationSummary> {
    const conversation = await this.prisma.conversationThread.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = conversation.messages;
    if (messages.length === 0) {
      return this.buildEmptySummary();
    }

    const conversationHistory = messages
      .map((m) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n');

    let aiResult: AiSummaryResponse | null = null;

    if (this.aiEngine.isReady()) {
      try {
        const response = await this.aiEngine.analyze<AiSummaryResponse>({
          template: 'comms.summarize-conversation',
          variables: { conversationHistory },
          tenantId,
          feature: 'communication',
        });
        aiResult = response.data;
      } catch (error) {
        this.logger.warn(`AI summarization failed: ${error.message}`);
      }
    }

    const summary = aiResult?.summary || this.generateFallbackSummary(messages);
    const keyPoints = aiResult?.keyTopics || this.extractKeyTopics(messages);
    const sentiment = this.mapSentiment(aiResult?.customerSentiment);
    const unresolvedIssues = aiResult?.followUpNeeded
      ? this.identifyUnresolvedIssues(aiResult, messages)
      : [];
    const recommendedActions = aiResult?.actionItems || [];

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    return {
      summary,
      keyPoints,
      customerSentiment: sentiment,
      unresolvedIssues,
      recommendedActions,
      messageCount: messages.length,
      timeSpan: {
        start: firstMessage.createdAt,
        end: lastMessage.createdAt,
      },
    };
  }

  async summarizeForHandoff(
    conversationId: string,
    tenantId: string,
    nextAgentContext?: string,
  ): Promise<string> {
    const fullSummary = await this.summarizeConversation(conversationId, tenantId);

    let handoffSummary = `Summary: ${fullSummary.summary}\n`;
    handoffSummary += `Sentiment: ${fullSummary.customerSentiment}\n`;

    if (fullSummary.unresolvedIssues.length > 0) {
      handoffSummary += `Unresolved: ${fullSummary.unresolvedIssues.join(', ')}\n`;
    }

    if (fullSummary.recommendedActions.length > 0) {
      handoffSummary += `Actions: ${fullSummary.recommendedActions.join(', ')}\n`;
    }

    if (nextAgentContext) {
      handoffSummary += `\nNote: ${nextAgentContext}`;
    }

    return handoffSummary;
  }

  private buildEmptySummary(): ConversationSummary {
    return {
      summary: 'No messages in conversation',
      keyPoints: [],
      customerSentiment: MessageSentiment.NEUTRAL,
      unresolvedIssues: [],
      recommendedActions: [],
      messageCount: 0,
      timeSpan: { start: new Date(), end: new Date() },
    };
  }

  private generateFallbackSummary(
    messages: Array<{ content: string; direction: string }>,
  ): string {
    const inboundCount = messages.filter((m) => m.direction === 'INBOUND').length;
    const outboundCount = messages.filter((m) => m.direction === 'OUTBOUND').length;
    return `Conversation with ${inboundCount} customer messages and ${outboundCount} agent responses.`;
  }

  private extractKeyTopics(
    messages: Array<{ content: string }>,
  ): string[] {
    const allContent = messages.map((m) => m.content.toLowerCase()).join(' ');
    const topics: string[] = [];

    const topicKeywords = {
      appointment: ['appointment', 'schedule', 'book', 'booking'],
      pricing: ['price', 'cost', 'quote', 'estimate', 'charge'],
      complaint: ['complaint', 'unhappy', 'issue', 'problem', 'frustrated'],
      service: ['service', 'repair', 'maintenance', 'fix'],
      emergency: ['emergency', 'urgent', 'asap', 'immediately'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((kw) => allContent.includes(kw))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private mapSentiment(aiSentiment: string | undefined): MessageSentiment {
    if (!aiSentiment) return MessageSentiment.NEUTRAL;

    switch (aiSentiment.toUpperCase()) {
      case 'POSITIVE':
        return MessageSentiment.POSITIVE;
      case 'NEGATIVE':
        return MessageSentiment.NEGATIVE;
      case 'URGENT':
        return MessageSentiment.URGENT;
      default:
        return MessageSentiment.NEUTRAL;
    }
  }

  private identifyUnresolvedIssues(
    aiResult: AiSummaryResponse,
    messages: Array<{ content: string; direction: string }>,
  ): string[] {
    const issues: string[] = [];

    // Check if follow-up is needed
    if (aiResult.followUpNeeded) {
      // Look for unanswered questions in customer messages
      const lastCustomerMessages = messages
        .filter((m) => m.direction === 'INBOUND')
        .slice(-2);

      for (const msg of lastCustomerMessages) {
        if (msg.content.includes('?')) {
          issues.push('Unanswered customer question');
          break;
        }
      }

      // Check for unaddressed topics in action items
      for (const item of aiResult.actionItems) {
        if (item.toLowerCase().includes('address') || item.toLowerCase().includes('review')) {
          issues.push(item);
        }
      }
    }

    return issues;
  }
}
