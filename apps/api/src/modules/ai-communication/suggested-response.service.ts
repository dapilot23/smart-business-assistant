import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ResponseSuggestion } from './response-generation.service';
import { ConversationService } from '../messaging/conversation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiFeedbackService } from '../ai-engine/ai-feedback.service';

@Injectable()
export class SuggestedResponseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationService,
    private readonly notifications: NotificationsService,
    private readonly aiFeedback: AiFeedbackService,
  ) {}

  async replaceSuggestions(
    tenantId: string,
    conversationId: string,
    messageId: string | null,
    suggestions: ResponseSuggestion[],
  ) {
    await this.prisma.suggestedResponse.updateMany({
      where: { tenantId, conversationId, accepted: null },
      data: { accepted: false },
    });

    const created = await Promise.all(
      suggestions.map((suggestion) =>
        this.prisma.suggestedResponse.create({
          data: {
            tenantId,
            conversationId,
            messageId: messageId || null,
            suggestion: suggestion.content,
            confidence: suggestion.confidence,
            tone: suggestion.tone,
          },
        }),
      ),
    );

    return created;
  }

  async listSuggestions(tenantId: string, conversationId: string) {
    return this.prisma.suggestedResponse.findMany({
      where: { tenantId, conversationId, accepted: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptSuggestion(
    tenantId: string,
    suggestionId: string,
    editedText?: string,
  ) {
    const suggestion = await this.prisma.suggestedResponse.findFirst({
      where: { id: suggestionId, tenantId },
      include: { conversation: { select: { customerPhone: true, channel: true } } },
    });

    if (!suggestion) {
      throw new NotFoundException('Suggested response not found');
    }

    const finalText = editedText?.trim() || suggestion.suggestion;

    await this.prisma.suggestedResponse.update({
      where: { id: suggestionId },
      data: { accepted: true, editedText: editedText?.trim() || null },
    });

    await this.aiFeedback.recordFeedback({
      tenantId,
      feature: 'communication',
      template: 'comms.generate-response',
      aiOutput: suggestion.suggestion,
      action: editedText ? 'EDITED' : 'ACCEPTED',
      humanEdit: editedText?.trim(),
    });

    if (suggestion.conversation?.customerPhone && suggestion.conversation.channel === 'SMS') {
      await this.conversations.sendMessage(tenantId, suggestion.conversationId, {
        content: finalText,
      });

      await this.notifications.queueSms(
        suggestion.conversation.customerPhone,
        finalText,
        tenantId,
        `suggested-response-${suggestionId}`,
      );
    }

    return { success: true };
  }

  async dismissSuggestion(tenantId: string, suggestionId: string) {
    const suggestion = await this.prisma.suggestedResponse.findFirst({
      where: { id: suggestionId, tenantId },
    });

    if (!suggestion) {
      throw new NotFoundException('Suggested response not found');
    }

    await this.prisma.suggestedResponse.update({
      where: { id: suggestionId },
      data: { accepted: false },
    });

    await this.aiFeedback.recordFeedback({
      tenantId,
      feature: 'communication',
      template: 'comms.generate-response',
      aiOutput: suggestion.suggestion,
      action: 'REJECTED',
    });

    return { success: true };
  }
}
