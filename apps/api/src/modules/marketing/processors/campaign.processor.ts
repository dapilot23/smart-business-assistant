import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { SmsService } from '../../sms/sms.service';
import { CampaignJobData } from '../campaigns/campaigns.service';
import { CampaignStatus } from '@prisma/client';

@Processor('marketing-campaigns')
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<string> {
    const { campaignId, tenantId, action } = job.data;
    this.logger.log(`Processing campaign ${campaignId} action: ${action}`);

    try {
      return await this.prisma.withTenantContext(tenantId, async () => {
        switch (action) {
          case 'send':
            return await this.sendCampaign(campaignId, tenantId);
          case 'send_step':
            return await this.sendStep(campaignId, tenantId, job.data.stepNumber ?? 1);
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      });
    } catch (error) {
      this.logger.error(`Campaign ${campaignId} failed`, error);
      throw error;
    }
  }

  private async sendCampaign(campaignId: string, tenantId: string): Promise<string> {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        segment: true,
        steps: { orderBy: { stepNumber: 'asc' } },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status === CampaignStatus.PAUSED || campaign.status === CampaignStatus.CANCELLED) {
      return 'Campaign is paused or cancelled';
    }

    // Get recipients based on segment or all customers
    const recipients = await this.getRecipients(tenantId, campaign.audienceSegmentId);

    // Update total recipients count
    await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: { totalRecipients: recipients.length },
    });

    let sentCount = 0;

    // For drip sequences, only send step 1
    if (campaign.steps.length > 0) {
      return this.sendStep(campaignId, tenantId, 1);
    }

    // For simple campaigns, send to all recipients
    for (const recipient of recipients) {
      try {
        // Create recipient record if not exists
        await this.prisma.campaignRecipient.upsert({
          where: {
            campaignId_customerId_stepNumber: {
              campaignId,
              customerId: recipient.id,
              stepNumber: 1,
            },
          },
          update: {},
          create: {
            campaignId,
            customerId: recipient.id,
            stepNumber: 1,
            variant: this.assignVariant(campaign.isAbTest, campaign.variants as any),
          },
        });

        // Send based on channel
        if (campaign.channel === 'SMS' && recipient.phone) {
          await this.smsService.sendSms(recipient.phone, campaign.content ?? '', {
            tenantId: campaign.tenantId,
          });
          sentCount++;
        } else if (campaign.channel === 'EMAIL' && recipient.email) {
          // Email sending would be handled by EmailService when expanded
          this.logger.log(`Would send email to ${recipient.email}`);
          sentCount++;
        }

        // Update recipient status
        await this.prisma.campaignRecipient.update({
          where: {
            campaignId_customerId_stepNumber: {
              campaignId,
              customerId: recipient.id,
              stepNumber: 1,
            },
          },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } catch (error) {
        this.logger.error(`Failed to send to ${recipient.id}`, error);
        await this.prisma.campaignRecipient.update({
          where: {
            campaignId_customerId_stepNumber: {
              campaignId,
              customerId: recipient.id,
              stepNumber: 1,
            },
          },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    // Update campaign metrics
    await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: sentCount },
        status: CampaignStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return `Sent to ${sentCount}/${recipients.length} recipients`;
  }

  private async sendStep(
    campaignId: string,
    tenantId: string,
    stepNumber: number,
  ): Promise<string> {
    const step = await this.prisma.campaignStep.findUnique({
      where: { campaignId_stepNumber: { campaignId, stepNumber } },
    });

    if (!step) {
      return 'No more steps';
    }

    const recipients = await this.getRecipients(tenantId, null);
    let sentCount = 0;

    for (const recipient of recipients) {
      // Check conditions if any
      if (step.conditions && !await this.checkConditions(campaignId, recipient.id, step.conditions as any)) {
        continue;
      }

      try {
        if (step.channel === 'SMS' && recipient.phone) {
          await this.smsService.sendSms(recipient.phone, step.content, {
            tenantId,
          });
          sentCount++;
        } else if (step.channel === 'EMAIL' && recipient.email) {
          // Email sending would be handled by EmailService when expanded
          this.logger.log(`Would send email to ${recipient.email}`);
          sentCount++;
        }

        await this.prisma.campaignRecipient.upsert({
          where: {
            campaignId_customerId_stepNumber: {
              campaignId,
              customerId: recipient.id,
              stepNumber,
            },
          },
          update: { status: 'SENT', sentAt: new Date() },
          create: {
            campaignId,
            customerId: recipient.id,
            stepNumber,
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Step ${stepNumber} failed for ${recipient.id}`, error);
      }
    }

    // Update step metrics
    await this.prisma.campaignStep.update({
      where: { id: step.id },
      data: { sentCount: { increment: sentCount } },
    });

    return `Step ${stepNumber}: sent to ${sentCount} recipients`;
  }

  private async getRecipients(tenantId: string, segmentId: string | null) {
    if (segmentId) {
      const segment = await this.prisma.audienceSegment.findUnique({
        where: { id: segmentId },
      });

      if (segment?.rules) {
        // This would use the rules engine in a full implementation
        // For now, return all customers
      }
    }

    return this.prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, name: true, phone: true, email: true },
    });
  }

  private assignVariant(isAbTest: boolean, variants: Record<string, unknown> | null): string | null {
    if (!isAbTest || !variants) return null;

    const variantKeys = Object.keys(variants);
    const randomIndex = Math.floor(Math.random() * variantKeys.length);
    return variantKeys[randomIndex];
  }

  private async checkConditions(
    campaignId: string,
    customerId: string,
    conditions: { ifOpened?: boolean; ifClicked?: boolean },
  ): Promise<boolean> {
    const previousStep = await this.prisma.campaignRecipient.findFirst({
      where: { campaignId, customerId },
      orderBy: { stepNumber: 'desc' },
    });

    if (!previousStep) return true;

    if (conditions.ifOpened !== undefined) {
      const opened = !!previousStep.openedAt;
      if (conditions.ifOpened !== opened) return false;
    }

    if (conditions.ifClicked !== undefined) {
      const clicked = !!previousStep.clickedAt;
      if (conditions.ifClicked !== clicked) return false;
    }

    return true;
  }
}
