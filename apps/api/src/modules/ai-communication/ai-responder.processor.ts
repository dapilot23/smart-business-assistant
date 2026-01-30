import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { MessageClassificationService, ClassificationResult } from './message-classification.service';
import { ResponseGenerationService } from './response-generation.service';
import { SuggestedResponseService } from './suggested-response.service';
import { ConversationService } from '../messaging/conversation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AI_RESPONDER_QUEUE, AiResponderJob } from './ai-responder.service';
import { MessageDirection } from '@prisma/client';
import { AiResponderRoutingService } from './ai-responder-routing.service';
import { BusinessHoursService } from './business-hours.service';

@Processor(AI_RESPONDER_QUEUE)
export class AiResponderProcessor extends WorkerHost {
  private readonly logger = new Logger(AiResponderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classification: MessageClassificationService,
    private readonly responseGeneration: ResponseGenerationService,
    private readonly suggestions: SuggestedResponseService,
    private readonly conversations: ConversationService,
    private readonly notifications: NotificationsService,
    private readonly routing: AiResponderRoutingService,
    private readonly businessHours: BusinessHoursService,
  ) {
    super();
  }

  async process(job: Job<AiResponderJob>): Promise<void> {
    const { tenantId } = job.data;
    await this.prisma.withTenantContext(tenantId, async () => {
      await this.handleJob(job.data);
    });
  }

  private async handleJob(data: AiResponderJob): Promise<void> {
    this.logger.debug(`Processing inbound message ${data.messageId}`);
    const message = await this.prisma.message.findUnique({
      where: { id: data.messageId },
      include: {
        thread: true,
      },
    });

    if (!message || message.direction !== MessageDirection.INBOUND) {
      return;
    }

    const classification = await this.classification.classifyMessage(
      message.id,
      message.content,
      data.tenantId,
      message.threadId,
    );

    await this.routing.applyRouting(message.threadId, data.tenantId, classification);

    if (data.skipAi) {
      return;
    }

    const withinHours = await this.businessHours.isWithinBusinessHours(data.tenantId);
    if (!withinHours) {
      await this.autoRespond(message.threadId, data.tenantId, classification);
      return;
    }

    const suggestions = await this.responseGeneration.generateResponseSuggestions(
      message.threadId,
      data.tenantId,
      3,
    );

    await this.suggestions.replaceSuggestions(
      data.tenantId,
      message.threadId,
      message.id,
      suggestions,
    );
  }

  private async autoRespond(
    conversationId: string,
    tenantId: string,
    classification: ClassificationResult,
  ): Promise<void> {
    const conversation = await this.prisma.conversationThread.findUnique({
      where: { id: conversationId },
      select: { customerPhone: true, channel: true },
    });

    if (!conversation?.customerPhone || conversation.channel !== 'SMS') {
      return;
    }

    const autoRule = await this.responseGeneration.findMatchingAutoResponder(
      classification,
      tenantId,
    );

    let content = autoRule?.generatedResponse;
    if (!content) {
      const suggestions = await this.responseGeneration.generateResponseSuggestions(
        conversationId,
        tenantId,
        1,
      );
      content = suggestions[0]?.content || 'Thanks for your message. We will follow up soon.';
    }

    await this.conversations.sendMessage(tenantId, conversationId, { content });

    await this.notifications.queueSms(
      conversation.customerPhone,
      content,
      tenantId,
      `ai-auto-${conversationId}`,
    );
  }

}
