import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, MessageEventPayload } from '../../config/events/events.types';
import { AiResponderQueueService } from './ai-responder.service';

@Injectable()
export class InboundMessageEventHandler {
  private readonly logger = new Logger(InboundMessageEventHandler.name);

  constructor(private readonly aiResponderQueue: AiResponderQueueService) {}

  @OnEvent(EVENTS.MESSAGE_RECEIVED)
  async handleMessageReceived(payload: MessageEventPayload) {
    if (!payload?.tenantId || !payload?.messageId || !payload?.conversationId) {
      this.logger.warn('Invalid message payload received');
      return;
    }

    await this.aiResponderQueue.queueInboundMessage({
      tenantId: payload.tenantId,
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      skipAi: payload.skipAi,
    });
  }
}
