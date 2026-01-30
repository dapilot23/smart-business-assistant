import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PAYMENT_REMINDER_QUEUE,
  PaymentReminderJob,
  PaymentReminderService,
} from './payment-reminder.service';
import { toNum } from '../../common/utils/decimal';

@Processor(PAYMENT_REMINDER_QUEUE)
export class PaymentReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly reminderService: PaymentReminderService,
  ) {
    super();
  }

  async process(job: Job<PaymentReminderJob>): Promise<void> {
    const { reminderId, tenantId } = job.data;

    await this.prisma.withTenantContext(tenantId, async () => {
      const reminder = await this.prisma.paymentReminder.findUnique({
        where: { id: reminderId },
      });

      if (!reminder || reminder.status !== 'PENDING') {
        this.logger.log(`Reminder ${reminderId} skipped (not pending)`);
        return;
      }

      const invoice = await this.prisma.invoice.findUnique({
        where: { id: reminder.invoiceId },
        include: { customer: true, tenant: true },
      });

      if (!invoice || ['PAID', 'CANCELLED'].includes(invoice.status)) {
        this.logger.log(
          `Invoice ${reminder.invoiceId} resolved, skipping reminder`,
        );
        await this.markCancelled(reminderId);
        return;
      }

      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'usd',
      }).format(toNum(invoice.amount) - toNum(invoice.paidAmount));

      const { message, subject, isEscalation } =
        this.reminderService.getReminderMessage(
          reminder.step,
          invoice.customer.name,
          invoice.invoiceNumber,
          formatted,
        );

      await this.sendReminder(
        reminder.channel,
        invoice,
        message,
        subject,
        tenantId,
      );

      if (isEscalation) {
        await this.notifyBusinessOwner(tenantId, invoice);
      }

      await this.prisma.paymentReminder.update({
        where: { id: reminderId },
        data: { status: 'SENT', sentAt: new Date() },
      });

      this.logger.log(
        `Reminder step ${reminder.step} sent for invoice ${invoice.id}`,
      );
    });
  }

  private async sendReminder(
    channel: string,
    invoice: any,
    message: string,
    subject: string,
    tenantId: string,
  ) {
    if ((channel === 'SMS' || channel === 'BOTH') && invoice.customer.phone) {
      await this.notifications.queueSms(
        invoice.customer.phone,
        message,
        tenantId,
      );
    }
    if ((channel === 'EMAIL' || channel === 'BOTH') && invoice.customer.email) {
      await this.notifications.queueEmail(
        invoice.customer.email,
        subject || `Payment Reminder - ${invoice.invoiceNumber}`,
        'payment-reminder',
        {
          customerName: invoice.customer.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: toNum(invoice.amount) - toNum(invoice.paidAmount),
          message,
        },
        tenantId,
      );
    }
  }

  private async notifyBusinessOwner(tenantId: string, invoice: any) {
    const tenant = invoice.tenant;
    if (!tenant) return;

    const ownerMessage =
      `ESCALATION: Invoice ${invoice.invoiceNumber} for ${invoice.customer.name} ` +
      `is 14+ days overdue. Outstanding: $${(toNum(invoice.amount) - toNum(invoice.paidAmount)).toFixed(2)}`;

    if (tenant.email) {
      await this.notifications.queueEmail(
        tenant.email,
        `Overdue Escalation - ${invoice.invoiceNumber}`,
        'payment-escalation',
        {
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer.name,
          amount: toNum(invoice.amount) - toNum(invoice.paidAmount),
        },
        tenantId,
      );
    }

    if (tenant.phone) {
      await this.notifications.queueSms(tenant.phone, ownerMessage, tenantId);
    }
  }

  private async markCancelled(reminderId: string) {
    await this.prisma.paymentReminder.update({
      where: { id: reminderId },
      data: { status: 'CANCELLED' },
    });
  }
}
