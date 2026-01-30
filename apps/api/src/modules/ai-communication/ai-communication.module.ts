import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiCommunicationController } from './ai-communication.controller';
import { MessageClassificationService } from './message-classification.service';
import { ResponseGenerationService } from './response-generation.service';
import { ConversationSummaryService } from './conversation-summary.service';
import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AiResponderQueueService, AI_RESPONDER_QUEUE } from './ai-responder.service';
import { AiResponderProcessor } from './ai-responder.processor';
import { SuggestedResponseService } from './suggested-response.service';
import { InboundMessageEventHandler } from './inbound-message.handler';
import { BusinessHoursService } from './business-hours.service';
import { AiResponderRoutingService } from './ai-responder-routing.service';

@Module({
  imports: [
    AiEngineModule,
    NotificationsModule,
    MessagingModule,
    BullModule.registerQueue({ name: AI_RESPONDER_QUEUE }),
  ],
  controllers: [AiCommunicationController],
  providers: [
    MessageClassificationService,
    ResponseGenerationService,
    ConversationSummaryService,
    SuggestedResponseService,
    BusinessHoursService,
    AiResponderRoutingService,
    AiResponderQueueService,
    AiResponderProcessor,
    InboundMessageEventHandler,
  ],
  exports: [
    MessageClassificationService,
    ResponseGenerationService,
    ConversationSummaryService,
    SuggestedResponseService,
    AiResponderQueueService,
  ],
})
export class AiCommunicationModule {}
