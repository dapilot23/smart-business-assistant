import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EVENTS, TaskActionEventPayload } from '../../config/events/events.types';
import { EmailService } from '../email/email.service';
import {
  getCustomerIds,
  getIdArray,
  getPayloadString,
} from './task-ledger-action.utils';

const DEFAULT_EMAIL_SUBJECT = 'Message from your business';

@Injectable()
export class TaskLedgerEmailHandler {
  private readonly logger = new Logger(TaskLedgerEmailHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @OnEvent(EVENTS.EMAIL_REQUESTED)
  async handleEmail(payload: TaskActionEventPayload) {
    const { subject, html, text } = this.getEmailContent(payload);
    if (!html && !text) {
      this.logger.warn('Email requested without content');
      return;
    }
    const recipients = await this.resolveEmailRecipients(payload.tenantId, payload);
    if (recipients.length === 0) {
      this.logger.warn('Email requested without recipients');
      return;
    }
    await this.sendEmailToRecipients(payload.tenantId, recipients, {
      subject,
      html,
      text,
    });
  }

  private getEmailContent(payload: TaskActionEventPayload) {
    const subject =
      getPayloadString(payload, 'subject') || DEFAULT_EMAIL_SUBJECT;
    const html = getPayloadString(payload, 'html');
    const text =
      getPayloadString(payload, 'message') || getPayloadString(payload, 'text');
    return { subject, html, text };
  }

  private async resolveEmailRecipients(
    tenantId: string,
    payload: TaskActionEventPayload,
  ): Promise<string[]> {
    const direct = [
      getPayloadString(payload, 'email'),
      getPayloadString(payload, 'to'),
    ].filter(Boolean) as string[];

    const listed = [
      ...getIdArray(payload, 'emails'),
      ...getIdArray(payload, 'recipients'),
    ];

    const explicit = this.uniqueStrings([...direct, ...listed]);
    if (explicit.length > 0) return explicit;

    const customerIds = getCustomerIds(payload);
    if (customerIds.length > 0) {
      const customers = await this.prisma.customer.findMany({
        where: { tenantId, id: { in: customerIds } },
        select: { email: true },
      });
      return this.uniqueStrings(customers.map((customer) => customer.email));
    }

    const invoiceId = payload.invoiceId || payload.entityId;
    if (!invoiceId) return [];

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { customer: true },
    });

    if (invoice?.customer?.email) {
      return [invoice.customer.email];
    }

    return [];
  }

  private async sendEmailToRecipients(
    tenantId: string,
    recipients: string[],
    content: { subject: string; html?: string; text?: string },
  ) {
    for (const email of this.uniqueStrings(recipients)) {
      await this.email.sendCustomEmail({
        to: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        tenantId,
      });
    }
  }

  private uniqueStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(values.filter(Boolean) as string[]));
  }
}
