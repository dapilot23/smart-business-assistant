import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EVENTS, TaskActionEventPayload } from '../../config/events/events.types';
import { PaymentReminderService } from '../payment-reminders/payment-reminder.service';
import { QuoteFollowupService } from '../quotes/quote-followup.service';
import { getIdArray, getPayloadNumber, getPayloadValue } from './task-ledger-action.utils';
import { toNum } from '../../common/utils/decimal';

const DEFAULT_INVOICE_LIMIT = 10;
const DEFAULT_QUOTE_LIMIT = 10;
const QUOTE_FOLLOWUP_AGE_DAYS = 3;

@Injectable()
export class TaskLedgerActionHandler {
  private readonly logger = new Logger(TaskLedgerActionHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentReminders: PaymentReminderService,
    private readonly quoteFollowups: QuoteFollowupService,
  ) {}

  @OnEvent(EVENTS.PAYMENT_REMINDER_REQUESTED)
  async handlePaymentReminder(payload: TaskActionEventPayload) {
    const invoiceIds = this.getInvoiceIds(payload);
    if (invoiceIds.length > 0) {
      await this.scheduleInvoiceReminders(payload.tenantId, invoiceIds);
      return;
    }
    const scope = getPayloadValue(payload, 'scope');
    if (scope === 'overdue_invoices') {
      const limit = getPayloadNumber(payload, 'count', DEFAULT_INVOICE_LIMIT);
      await this.scheduleOverdueReminders(payload.tenantId, limit);
      return;
    }
    this.logger.warn('Payment reminder requested without invoice scope or invoiceId');
  }

  @OnEvent(EVENTS.LATE_FEE_REQUESTED)
  async handleLateFee(payload: TaskActionEventPayload) {
    const invoiceIds = this.getInvoiceIds(payload);
    if (invoiceIds.length > 0) {
      await this.applyLateFees(payload.tenantId, invoiceIds);
      return;
    }
    const scope = getPayloadValue(payload, 'scope');
    if (scope === 'overdue_invoices') {
      const limit = getPayloadNumber(payload, 'count', DEFAULT_INVOICE_LIMIT);
      await this.applyLateFeesForOverdue(payload.tenantId, limit);
      return;
    }
    this.logger.warn('Late fee requested without invoice scope or invoiceId');
  }

  @OnEvent(EVENTS.QUOTE_FOLLOWUP_REQUESTED)
  async handleQuoteFollowup(payload: TaskActionEventPayload) {
    const quoteIds = this.getQuoteIds(payload);
    if (quoteIds.length > 0) {
      await this.scheduleQuoteFollowups(payload.tenantId, quoteIds);
      return;
    }
    const scope = getPayloadValue(payload, 'scope');
    if (scope === 'pending_quotes') {
      const limit = getPayloadNumber(payload, 'count', DEFAULT_QUOTE_LIMIT);
      await this.schedulePendingQuoteFollowups(payload.tenantId, limit);
      return;
    }
    this.logger.warn('Quote follow-up requested without quote scope or quoteId');
  }

  private getInvoiceIds(payload: TaskActionEventPayload): string[] {
    const ids = getIdArray(payload, 'invoiceIds');
    if (payload.invoiceId) ids.unshift(payload.invoiceId);
    if (payload.entityId) ids.unshift(payload.entityId);
    return Array.from(new Set(ids.filter(Boolean)));
  }

  private getQuoteIds(payload: TaskActionEventPayload): string[] {
    const ids = getIdArray(payload, 'quoteIds');
    if (payload.quoteId) ids.unshift(payload.quoteId);
    if (payload.entityId) ids.unshift(payload.entityId);
    return Array.from(new Set(ids.filter(Boolean)));
  }

  private async scheduleInvoiceReminders(tenantId: string, invoiceIds: string[]) {
    for (const invoiceId of invoiceIds) {
      await this.paymentReminders.scheduleReminders(invoiceId, tenantId);
    }
  }

  private async scheduleOverdueReminders(tenantId: string, limit: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: 'OVERDUE' },
      orderBy: { dueDate: 'asc' },
      take: limit,
    });
    await this.scheduleInvoiceReminders(
      tenantId,
      invoices.map((invoice) => invoice.id),
    );
  }

  private async scheduleQuoteFollowups(tenantId: string, quoteIds: string[]) {
    for (const quoteId of quoteIds) {
      await this.quoteFollowups.scheduleFollowUps(tenantId, quoteId);
    }
  }

  private async schedulePendingQuoteFollowups(tenantId: string, limit: number) {
    const cutoff = new Date(Date.now() - QUOTE_FOLLOWUP_AGE_DAYS * 24 * 60 * 60 * 1000);
    const quotes = await this.prisma.quote.findMany({
      where: {
        tenantId,
        status: 'SENT',
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    await this.scheduleQuoteFollowups(
      tenantId,
      quotes.map((quote) => quote.id),
    );
  }

  private async applyLateFees(tenantId: string, invoiceIds: string[]) {
    for (const invoiceId of invoiceIds) {
      await this.applyLateFee(tenantId, invoiceId);
    }
  }

  private async applyLateFeesForOverdue(tenantId: string, limit: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: 'OVERDUE', lateFeeApplied: false },
      orderBy: { dueDate: 'asc' },
      take: limit,
    });
    await this.applyLateFees(
      tenantId,
      invoices.map((invoice) => invoice.id),
    );
  }

  private async applyLateFee(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice ${invoiceId} not found for late fee`);
      return;
    }

    if (invoice.status !== 'OVERDUE' || invoice.lateFeeApplied) {
      return;
    }

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings?.lateFeeEnabled) {
      this.logger.log(`Late fees disabled for tenant ${tenantId}`);
      return;
    }

    const feePercentage = settings.lateFeePercentage || 5;
    const outstanding = toNum(invoice.amount) - toNum(invoice.paidAmount);

    if (outstanding <= 0) {
      return;
    }

    const lateFeeAmount = Math.round(outstanding * feePercentage) / 100;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        lateFeeApplied: true,
        lateFeeAmount,
        amount: toNum(invoice.amount) + lateFeeAmount,
      },
    });
  }

}
