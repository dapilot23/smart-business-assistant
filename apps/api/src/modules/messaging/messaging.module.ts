import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { ConversationService } from './conversation.service';
import { WhatsAppService } from './whatsapp.service';
import { QuickReplyService } from './quick-reply.service';

@Module({
  controllers: [MessagingController],
  providers: [ConversationService, WhatsAppService, QuickReplyService],
  exports: [ConversationService, WhatsAppService, QuickReplyService],
})
export class MessagingModule {}
