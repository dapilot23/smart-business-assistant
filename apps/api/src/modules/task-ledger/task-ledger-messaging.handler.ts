import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EVENTS, TaskActionEventPayload } from '../../config/events/events.types';
import { SmsService } from '../sms/sms.service';
import { SuggestedResponseService } from '../ai-communication/suggested-response.service';
import { ConversationService } from '../messaging/conversation.service';
import {
  getCustomerIds,
  getIdArray,
  getPayloadString,
} from './task-ledger-action.utils';

@Injectable()
export class TaskLedgerMessagingHandler {
  private readonly logger = new Logger(TaskLedgerMessagingHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly suggestedResponses: SuggestedResponseService,
    private readonly conversations: ConversationService,
  ) {}

  @OnEvent(EVENTS.SMS_REQUESTED)
  async handleSms(payload: TaskActionEventPayload) {
    const message = this.getSmsMessage(payload);
    if (!message) {
      this.logger.warn('SMS requested without message');
      return;
    }
    const recipients = await this.resolveSmsRecipients(payload.tenantId, payload);
    if (recipients.length === 0) {
      this.logger.warn('SMS requested without recipients');
      return;
    }
    await this.sendSmsToRecipients(payload.tenantId, recipients, message);
  }

  @OnEvent(EVENTS.AI_RESPONSE_REQUESTED)
  async handleAiResponse(payload: TaskActionEventPayload) {
    const suggestionId = getPayloadString(payload, 'suggestionId');
    if (suggestionId) {
      await this.suggestedResponses.acceptSuggestion(
        payload.tenantId,
        suggestionId,
        getPayloadString(payload, 'editedText'),
      );
      return;
    }

    const message = getPayloadString(payload, 'message');
    const conversationId = getPayloadString(payload, 'conversationId');

    if (conversationId && message) {
      await this.sendConversationResponse(payload.tenantId, conversationId, message);
      return;
    }

    const customerIds = getCustomerIds(payload);
    if (message && customerIds.length > 0) {
      const phones = await this.lookupCustomerPhones(payload.tenantId, customerIds);
      if (phones.length > 0) {
        await this.sendSmsToRecipients(payload.tenantId, phones, message);
        return;
      }
    }

    this.logger.warn('AI response requested without suggestionId or message target');
  }

  private getSmsMessage(payload: TaskActionEventPayload) {
    return getPayloadString(payload, 'message') || getPayloadString(payload, 'text');
  }

  private async resolveSmsRecipients(
    tenantId: string,
    payload: TaskActionEventPayload,
  ): Promise<string[]> {
    const direct = [
      getPayloadString(payload, 'phone'),
      getPayloadString(payload, 'to'),
    ].filter(Boolean) as string[];

    const listed = [
      ...getIdArray(payload, 'phones'),
      ...getIdArray(payload, 'phoneNumbers'),
      ...getIdArray(payload, 'recipients'),
    ];

    const explicit = this.uniqueStrings([...direct, ...listed]);
    if (explicit.length > 0) return explicit;

    const customerIds = getCustomerIds(payload);
    if (customerIds.length === 0) return [];

    return this.lookupCustomerPhones(tenantId, customerIds);
  }

  private async lookupCustomerPhones(tenantId: string, ids: string[]) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: ids } },
      select: { phone: true },
    });
    return this.uniqueStrings(customers.map((customer) => customer.phone));
  }

  private async sendSmsToRecipients(
    tenantId: string,
    recipients: string[],
    message: string,
  ) {
    const normalized = this.uniqueStrings(recipients);
    if (normalized.length === 0) return;
    if (normalized.length === 1) {
      await this.sms.sendSms(normalized[0], message, { tenantId });
      return;
    }
    await this.sms.sendBulkSms(normalized, message, tenantId);
  }

  private async sendConversationResponse(
    tenantId: string,
    conversationId: string,
    message: string,
  ) {
    try {
      const conversation = await this.conversations.getConversation(
        tenantId,
        conversationId,
      );

      await this.conversations.sendMessage(tenantId, conversationId, {
        content: message,
      });

      if (conversation.channel === 'SMS' && conversation.customerPhone) {
        await this.sms.sendSms(conversation.customerPhone, message, { tenantId });
      }
    } catch (error) {
      this.logger.warn(`Failed to send AI response: ${error}`);
    }
  }

  private uniqueStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(values.filter(Boolean) as string[]));
  }
}
