import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';

export const PAYMENT_REMINDER_QUEUE = 'payment-reminders';

export interface PaymentReminderJob {
  tenantId: string;
  invoiceId: string;
  reminderId: string;
  step: number;
  channel: 'SMS' | 'EMAIL' | 'BOTH';
}

interface ReminderStep {
  step: number;
  channel: 'SMS' | 'EMAIL' | 'BOTH';
  delayDays: number; // relative to due date (negative = before)
}

const REMINDER_STEPS: ReminderStep[] = [
  { step: 1, channel: 'SMS', delayDays: -3 },
  { step: 2, channel: 'EMAIL', delayDays: 0 },
  { step: 3, channel: 'SMS', delayDays: 3 },
  { step: 4, channel: 'EMAIL', delayDays: 7 },
  { step: 5, channel: 'BOTH', delayDays: 14 },
];

@Injectable()
export class PaymentReminderService {
  private readonly logger = new Logger(PaymentReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(PAYMENT_REMINDER_QUEUE) private readonly queue: Queue,
  ) {}

  async scheduleReminders(invoiceId: string, tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (settings && !settings.paymentReminderEnabled) {
      this.logger.log(`Payment reminders disabled for tenant ${tenantId}`);
      return;
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      this.logger.warn(`Invoice ${invoiceId} not found for reminder scheduling`);
      return;
    }

    const now = new Date();
    const reminders = await this.createReminderRecords(
      tenantId,
      invoiceId,
      invoice.dueDate,
      now,
    );

    await this.enqueueReminderJobs(tenantId, invoiceId, reminders, now);

    this.logger.log(
      `Scheduled ${reminders.length} reminders for invoice ${invoiceId}`,
    );
  }

  async cancelReminders(invoiceId: string) {
    const pending = await this.prisma.paymentReminder.findMany({
      where: { invoiceId, status: 'PENDING' },
    });

    if (pending.length === 0) return;

    await this.prisma.paymentReminder.updateMany({
      where: { invoiceId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    for (const reminder of pending) {
      try {
        const job = await this.queue.getJob(`reminder-${reminder.id}`);
        if (job) await job.remove();
      } catch (error) {
        this.logger.warn(
          `Failed to remove job for reminder ${reminder.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Cancelled ${pending.length} reminders for invoice ${invoiceId}`,
    );
  }

  getReminderMessage(
    step: number,
    customerName: string,
    invoiceNumber: string,
    amount: string,
  ): { message: string; subject: string; isEscalation: boolean } {
    switch (step) {
      case 1:
        return {
          message: `Hi ${customerName}, friendly reminder that your invoice ${invoiceNumber} for ${amount} is due in 3 days.`,
          subject: '',
          isEscalation: false,
        };
      case 2:
        return {
          message: `Your invoice ${invoiceNumber} for ${amount} is due today. Please submit payment at your earliest convenience.`,
          subject: `Invoice ${invoiceNumber} Due Today - ${amount}`,
          isEscalation: false,
        };
      case 3:
        return {
          message: `Hi ${customerName}, your invoice ${invoiceNumber} for ${amount} is now overdue. Please pay as soon as possible.`,
          subject: '',
          isEscalation: false,
        };
      case 4:
        return {
          message: `Final notice: Invoice ${invoiceNumber} for ${amount} is 7 days overdue. A late fee may be applied.`,
          subject: `Overdue Notice - Invoice ${invoiceNumber}`,
          isEscalation: false,
        };
      case 5:
        return {
          message: `Hi ${customerName}, your invoice ${invoiceNumber} for ${amount} is 14 days overdue. Please contact us immediately to resolve this.`,
          subject: `Urgent: Invoice ${invoiceNumber} - 14 Days Overdue`,
          isEscalation: true,
        };
      default:
        return { message: '', subject: '', isEscalation: false };
    }
  }

  private async createReminderRecords(
    tenantId: string,
    invoiceId: string,
    dueDate: Date,
    now: Date,
  ) {
    const records = REMINDER_STEPS
      .map((step) => {
        const scheduledAt = new Date(
          dueDate.getTime() + step.delayDays * 24 * 60 * 60 * 1000,
        );
        return {
          tenantId,
          invoiceId,
          step: step.step,
          channel: step.channel,
          scheduledAt,
          status: 'PENDING',
        };
      })
      .filter((r) => r.scheduledAt.getTime() > now.getTime());

    const created = await Promise.all(
      records.map((data) => this.prisma.paymentReminder.create({ data })),
    );

    return created;
  }

  private async enqueueReminderJobs(
    tenantId: string,
    invoiceId: string,
    reminders: { id: string; step: number; channel: string; scheduledAt: Date }[],
    now: Date,
  ) {
    for (const reminder of reminders) {
      const delay = reminder.scheduledAt.getTime() - now.getTime();

      const jobData: PaymentReminderJob = {
        tenantId,
        invoiceId,
        reminderId: reminder.id,
        step: reminder.step,
        channel: reminder.channel as 'SMS' | 'EMAIL' | 'BOTH',
      };

      await this.queue.add('process-reminder', jobData, {
        delay,
        jobId: `reminder-${reminder.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      });
    }
  }
}
