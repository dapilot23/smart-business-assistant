import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, RetentionEventPayload } from '../../config/events/events.types';
import { RETENTION_QUEUE, RetentionJob } from './retention-sequence.service';

@Processor(RETENTION_QUEUE)
export class RetentionProcessor extends WorkerHost {
  private readonly logger = new Logger(RetentionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly eventsService: EventsService,
  ) {
    super();
  }

  async process(job: Job<RetentionJob>): Promise<void> {
    const { campaignId, customerId, type, step, tenantId } = job.data;

    await this.prisma.withTenantContext(tenantId, async () => {
      this.logger.log(`Processing retention campaign ${campaignId} for customer ${customerId}, step ${step}`);

      // 1. Look up campaign record
      const campaign = await this.prisma.retentionCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign || campaign.status !== 'PENDING') {
        this.logger.warn(`Campaign ${campaignId} not found or not PENDING, skipping`);
        return;
      }

      // 2. Look up customer
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: { tenant: true },
      });

      if (!customer) {
        this.logger.error(`Customer ${customerId} not found, marking campaign as FAILED`);
        await this.prisma.retentionCampaign.update({
          where: { id: campaignId },
          data: { status: 'FAILED' },
        });
        return;
      }

      // 3. Build message
      const { message, subject } = this.buildMessage(step, customer.name, type);

      // 4. Send notification
      await this.sendNotification(campaign.channel, customer, message, subject, customer.tenantId);

      // 5. Update campaign status
      await this.prisma.retentionCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          message,
        },
      });

      // 6. Emit event
      this.eventsService.emit<RetentionEventPayload>(EVENTS.RETENTION_TRIGGERED, {
        tenantId: customer.tenantId,
        campaignId: campaign.id,
        customerId: customer.id,
        customerName: customer.name,
        type,
        step,
      });

      this.logger.log(`Successfully processed retention campaign ${campaignId}`);
    });
  }

  private buildMessage(step: number, customerName: string, type: string): { message: string; subject: string } {
    const name = customerName || 'there';

    switch (step) {
      case 1:
        return {
          message: `Hi ${name}, it's been a while! We'd love to help you again. Book your next service here: [link]`,
          subject: `We miss you, ${name}!`,
        };
      case 2:
        return {
          message: `Hi ${name}, we noticed you haven't been back in a while. Our team is ready to provide the same great service you experienced before. Schedule your appointment today and let us take care of you again!`,
          subject: `${name}, let's reconnect!`,
        };
      case 3:
        return {
          message: `Hi ${name}, we have a special offer for returning customers. Don't miss out! Book now.`,
          subject: `Exclusive offer for you, ${name}`,
        };
      default:
        return {
          message: `Hi ${name}, we'd love to see you again!`,
          subject: `Come back and see us, ${name}`,
        };
    }
  }

  private async sendNotification(
    channel: string,
    customer: any,
    message: string,
    subject: string,
    tenantId: string,
  ): Promise<void> {
    switch (channel) {
      case 'SMS':
        if (customer.phone) {
          await this.notifications.queueSms(customer.phone, message, tenantId);
        }
        break;
      case 'EMAIL':
        if (customer.email) {
          await this.notifications.queueEmail(
            customer.email,
            subject,
            'retention-campaign',
            { customerName: customer.name, message, step: 1 },
            tenantId,
          );
        }
        break;
      case 'BOTH':
        if (customer.phone) {
          await this.notifications.queueSms(customer.phone, message, tenantId);
        }
        if (customer.email) {
          await this.notifications.queueEmail(
            customer.email,
            subject,
            'retention-campaign',
            { customerName: customer.name, message, step: 1 },
            tenantId,
          );
        }
        break;
      default:
        this.logger.warn(`Unknown channel: ${channel}`);
    }
  }
}
