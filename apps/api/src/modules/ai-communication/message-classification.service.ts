import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import {
  MessageIntent,
  MessageSentiment,
  MessageClassification,
} from '@prisma/client';

export interface ClassificationResult {
  intent: MessageIntent;
  sentiment: MessageSentiment;
  confidence: number;
  urgencyScore: number;
  keywords: string[];
  suggestedRoute: string | null;
}

interface AiClassificationResponse {
  intent: string;
  sentiment: string;
  confidence: number;
  summary: string;
}

const EMERGENCY_KEYWORDS = [
  'emergency',
  'urgent',
  'asap',
  'immediately',
  'flooding',
  'fire',
  'leak',
  'burst',
  'broken',
  'dangerous',
  'safety',
  'help',
];

const URGENCY_KEYWORDS = [
  'need',
  'today',
  'now',
  'soon',
  'important',
  'waiting',
  'frustrated',
  'problem',
];

@Injectable()
export class MessageClassificationService {
  private readonly logger = new Logger(MessageClassificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
  ) {}

  async classifyMessage(
    messageId: string,
    content: string,
    tenantId: string,
    conversationId: string,
    customerContext?: string,
  ): Promise<ClassificationResult> {
    const existing = await this.prisma.messageClassification.findUnique({
      where: { messageId },
    });
    if (existing) {
      return {
        intent: existing.intent,
        sentiment: existing.sentiment,
        confidence: existing.confidence,
        urgencyScore: existing.urgencyScore,
        keywords: existing.keywords,
        suggestedRoute: existing.suggestedRoute,
      };
    }

    let aiResult: AiClassificationResponse | null = null;

    if (this.aiEngine.isReady()) {
      try {
        const response = await this.aiEngine.analyze<AiClassificationResponse>({
          template: 'comms.classify-intent',
          variables: {
            messageText: content,
            customerContext: customerContext || 'No previous context',
          },
          tenantId,
          feature: 'communication',
        });
        aiResult = response.data;
      } catch (error) {
        this.logger.warn(`AI classification failed: ${error.message}`);
      }
    }

    const intent = this.mapIntent(aiResult?.intent, content);
    const sentiment = this.mapSentiment(aiResult?.sentiment, content);
    const confidence = aiResult?.confidence ?? this.estimateConfidence(content);
    const urgencyScore = this.detectUrgency(content, sentiment);
    const keywords = this.extractKeywords(content);
    const suggestedRoute = this.determineSuggestedRoute(intent, urgencyScore);

    const classification = await this.prisma.messageClassification.create({
      data: {
        tenantId,
        conversationId,
        messageId,
        intent,
        sentiment,
        confidence,
        urgencyScore,
        keywords,
        suggestedRoute,
      },
    });

    this.logger.debug(
      `Classified message ${messageId}: ${intent}, ${sentiment}, urgency=${urgencyScore}`,
    );

    return {
      intent: classification.intent,
      sentiment: classification.sentiment,
      confidence: classification.confidence,
      urgencyScore: classification.urgencyScore,
      keywords: classification.keywords,
      suggestedRoute: classification.suggestedRoute,
    };
  }

  async getClassification(
    messageId: string,
  ): Promise<MessageClassification | null> {
    return this.prisma.messageClassification.findUnique({
      where: { messageId },
    });
  }

  async getConversationClassifications(
    conversationId: string,
  ): Promise<MessageClassification[]> {
    return this.prisma.messageClassification.findMany({
      where: { conversationId },
      orderBy: { processedAt: 'asc' },
    });
  }

  detectUrgency(content: string, sentiment: MessageSentiment): number {
    const lowerContent = content.toLowerCase();
    let score = 0;

    // Check for emergency keywords (high weight)
    const emergencyMatches = EMERGENCY_KEYWORDS.filter((kw) =>
      lowerContent.includes(kw),
    );
    score += emergencyMatches.length * 20;

    // Check for urgency keywords (medium weight)
    const urgencyMatches = URGENCY_KEYWORDS.filter((kw) =>
      lowerContent.includes(kw),
    );
    score += urgencyMatches.length * 10;

    // Sentiment modifiers
    if (sentiment === MessageSentiment.URGENT) score += 40;
    else if (sentiment === MessageSentiment.NEGATIVE) score += 20;

    // All caps detection (indicates urgency)
    const capsRatio =
      (content.match(/[A-Z]/g)?.length || 0) / Math.max(content.length, 1);
    if (capsRatio > 0.5) score += 15;

    // Exclamation marks
    const exclamationCount = (content.match(/!/g) || []).length;
    score += Math.min(exclamationCount * 5, 15);

    return Math.min(score, 100);
  }

  private mapIntent(aiIntent: string | undefined, content: string): MessageIntent {
    const lowerContent = content.toLowerCase();

    // Map AI response intent to schema enum
    if (aiIntent) {
      switch (aiIntent.toUpperCase()) {
        case 'BOOKING':
          if (lowerContent.includes('reschedule') || lowerContent.includes('change')) {
            return MessageIntent.RESCHEDULE_REQUEST;
          }
          if (lowerContent.includes('cancel')) {
            return MessageIntent.CANCELLATION_REQUEST;
          }
          return MessageIntent.BOOKING_REQUEST;
        case 'PRICING':
          return MessageIntent.INQUIRY;
        case 'STATUS':
          return MessageIntent.FOLLOW_UP;
        case 'COMPLAINT':
          return MessageIntent.COMPLAINT;
        case 'OTHER':
          // Check for emergency keywords
          if (EMERGENCY_KEYWORDS.some((kw) => lowerContent.includes(kw))) {
            return MessageIntent.EMERGENCY;
          }
          return MessageIntent.GENERAL;
      }
    }

    // Fallback keyword-based classification
    if (lowerContent.includes('cancel')) return MessageIntent.CANCELLATION_REQUEST;
    if (lowerContent.includes('reschedule')) return MessageIntent.RESCHEDULE_REQUEST;
    if (lowerContent.includes('book') || lowerContent.includes('appointment')) {
      return MessageIntent.BOOKING_REQUEST;
    }
    if (lowerContent.includes('price') || lowerContent.includes('cost')) {
      return MessageIntent.INQUIRY;
    }
    if (lowerContent.includes('complaint') || lowerContent.includes('unhappy')) {
      return MessageIntent.COMPLAINT;
    }
    if (EMERGENCY_KEYWORDS.some((kw) => lowerContent.includes(kw))) {
      return MessageIntent.EMERGENCY;
    }
    if (lowerContent.includes('feedback') || lowerContent.includes('review')) {
      return MessageIntent.FEEDBACK;
    }
    if (lowerContent.includes('status') || lowerContent.includes('update')) {
      return MessageIntent.FOLLOW_UP;
    }

    return MessageIntent.GENERAL;
  }

  private mapSentiment(
    aiSentiment: string | undefined,
    content: string,
  ): MessageSentiment {
    if (aiSentiment) {
      switch (aiSentiment.toUpperCase()) {
        case 'POSITIVE':
          return MessageSentiment.POSITIVE;
        case 'NEGATIVE':
          return MessageSentiment.NEGATIVE;
        case 'URGENT':
          return MessageSentiment.URGENT;
        case 'NEUTRAL':
        default:
          return MessageSentiment.NEUTRAL;
      }
    }

    // Fallback: keyword-based sentiment detection
    const lowerContent = content.toLowerCase();
    if (EMERGENCY_KEYWORDS.some((kw) => lowerContent.includes(kw))) {
      return MessageSentiment.URGENT;
    }
    if (
      lowerContent.includes('unhappy') ||
      lowerContent.includes('terrible') ||
      lowerContent.includes('frustrated')
    ) {
      return MessageSentiment.NEGATIVE;
    }
    if (
      lowerContent.includes('thank') ||
      lowerContent.includes('great') ||
      lowerContent.includes('appreciate')
    ) {
      return MessageSentiment.POSITIVE;
    }

    return MessageSentiment.NEUTRAL;
  }

  private estimateConfidence(content: string): number {
    // Fallback confidence when AI is not available
    // Longer messages with clear keywords get higher confidence
    const wordCount = content.split(/\s+/).length;
    const hasKeywords = [...EMERGENCY_KEYWORDS, ...URGENCY_KEYWORDS].some(
      (kw) => content.toLowerCase().includes(kw),
    );

    let confidence = 0.5;
    if (wordCount >= 5) confidence += 0.1;
    if (wordCount >= 10) confidence += 0.1;
    if (hasKeywords) confidence += 0.15;

    return Math.min(confidence, 0.85);
  }

  private extractKeywords(content: string): string[] {
    const lowerContent = content.toLowerCase();
    const words = lowerContent.split(/\s+/);
    const keywords: string[] = [];

    // Extract meaningful keywords
    const keywordPatterns = [
      'appointment',
      'book',
      'schedule',
      'reschedule',
      'cancel',
      'price',
      'cost',
      'quote',
      'service',
      'repair',
      'maintenance',
      'emergency',
      'urgent',
      'problem',
      'issue',
      'help',
      'status',
      'when',
      'time',
    ];

    for (const pattern of keywordPatterns) {
      if (words.some((w) => w.includes(pattern))) {
        keywords.push(pattern);
      }
    }

    return keywords.slice(0, 10); // Limit to 10 keywords
  }

  private determineSuggestedRoute(
    intent: MessageIntent,
    urgencyScore: number,
  ): string | null {
    // High urgency always goes to dispatch
    if (urgencyScore >= 80) return 'dispatch';

    switch (intent) {
      case MessageIntent.BOOKING_REQUEST:
      case MessageIntent.RESCHEDULE_REQUEST:
      case MessageIntent.CANCELLATION_REQUEST:
        return 'scheduling';
      case MessageIntent.COMPLAINT:
        return 'support';
      case MessageIntent.INQUIRY:
        return 'sales';
      case MessageIntent.EMERGENCY:
        return 'dispatch';
      case MessageIntent.FOLLOW_UP:
        return 'support';
      case MessageIntent.FEEDBACK:
        return 'support';
      default:
        return 'general';
    }
  }
}
