import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';
import { VoiceService } from '../voice/voice.service';
import { OutboundCampaignType, OutboundCampaignStatus } from '@prisma/client';

export const OUTBOUND_CAMPAIGN_QUEUE = 'outbound-campaigns';

export interface CreateCampaignDto {
  name: string;
  type: OutboundCampaignType;
  scheduledFor?: Date;
  template?: string;
  targetCustomerIds?: string[];
  metadata?: Record<string, any>;
}

export interface CampaignCallJob {
  campaignId: string;
  callId: string;
  customerId: string;
  customerPhone: string;
  tenantId: string;
  template?: string;
}

@Injectable()
export class OutboundCampaignsService {
  private readonly logger = new Logger(OutboundCampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voiceService: VoiceService,
    @InjectQueue(OUTBOUND_CAMPAIGN_QUEUE) private readonly campaignQueue: Queue,
  ) {}

  /**
   * Create a new outbound campaign
   */
  async createCampaign(tenantId: string, dto: CreateCampaignDto, createdBy?: string) {
    const campaign = await this.prisma.outboundCampaign.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        status: dto.scheduledFor ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: dto.scheduledFor,
        template: dto.template,
        metadata: dto.metadata || {},
        createdBy,
      },
    });

    this.logger.log(`Created campaign: ${campaign.id} (${dto.name})`);

    // If customers are specified, create outbound calls for them
    if (dto.targetCustomerIds?.length) {
      await this.addCallsToCampaign(campaign.id, tenantId, dto.targetCustomerIds);
    }

    return campaign;
  }

  /**
   * Add calls to an existing campaign
   */
  async addCallsToCampaign(campaignId: string, tenantId: string, customerIds: string[]) {
    const customers = await this.prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        tenantId,
        phone: { not: '' },
      },
      select: { id: true, phone: true },
    });

    const calls = await this.prisma.outboundCall.createMany({
      data: customers.map((c) => ({
        campaignId,
        customerId: c.id,
        customerPhone: c.phone,
        status: 'PENDING',
      })),
    });

    // Update campaign target count
    await this.prisma.outboundCampaign.update({
      where: { id: campaignId },
      data: { targetCount: { increment: calls.count } },
    });

    this.logger.log(`Added ${calls.count} calls to campaign ${campaignId}`);
    return calls.count;
  }

  /**
   * Create an appointment reminder campaign
   */
  async createAppointmentReminderCampaign(tenantId: string, hoursInAdvance = 24) {
    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + hoursInAdvance);

    const startWindow = new Date(reminderTime);
    startWindow.setMinutes(startWindow.getMinutes() - 30);
    const endWindow = new Date(reminderTime);
    endWindow.setMinutes(endWindow.getMinutes() + 30);

    // Find appointments in the window that haven't been reminded
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: startWindow, lte: endWindow },
      },
      include: {
        customer: true,
        service: true,
      },
    });

    if (appointments.length === 0) {
      this.logger.log('No appointments need reminders');
      return null;
    }

    const campaign = await this.createCampaign(tenantId, {
      name: `Appointment Reminders - ${new Date().toLocaleDateString()}`,
      type: 'APPOINTMENT_REMINDER',
      scheduledFor: new Date(),
      template: this.getAppointmentReminderTemplate(),
      targetCustomerIds: appointments.map((a) => a.customerId),
    });

    return campaign;
  }

  /**
   * Create a post-job follow-up survey campaign
   */
  async createFollowUpSurveyCampaign(tenantId: string, jobIds: string[]) {
    const jobs = await this.prisma.job.findMany({
      where: {
        id: { in: jobIds },
        tenantId,
        status: 'COMPLETED',
      },
      include: {
        appointment: {
          include: { customer: true },
        },
      },
    });

    if (jobs.length === 0) {
      this.logger.log('No completed jobs for survey');
      return null;
    }

    const customerIds = jobs
      .map((j) => j.appointment.customerId)
      .filter((id, i, arr) => arr.indexOf(id) === i);

    const campaign = await this.createCampaign(tenantId, {
      name: `Follow-up Survey - ${new Date().toLocaleDateString()}`,
      type: 'FOLLOW_UP_SURVEY',
      scheduledFor: new Date(),
      template: this.getFollowUpSurveyTemplate(),
      targetCustomerIds: customerIds,
    });

    return campaign;
  }

  /**
   * Start executing a campaign
   */
  async startCampaign(campaignId: string) {
    const campaign = await this.prisma.outboundCampaign.findUnique({
      where: { id: campaignId },
      include: { calls: { where: { status: 'PENDING' } } },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.outboundCampaign.update({
      where: { id: campaignId },
      data: { status: 'IN_PROGRESS' },
    });

    // Queue all pending calls
    for (const call of campaign.calls) {
      await this.campaignQueue.add(
        'execute-call',
        {
          campaignId,
          callId: call.id,
          customerId: call.customerId,
          customerPhone: call.customerPhone,
          tenantId: campaign.tenantId,
          template: campaign.template,
        } as CampaignCallJob,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        },
      );
    }

    this.logger.log(`Started campaign ${campaignId} with ${campaign.calls.length} calls`);
    return campaign;
  }

  /**
   * Pause a running campaign
   */
  async pauseCampaign(campaignId: string) {
    return this.prisma.outboundCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId: string) {
    await this.prisma.outboundCall.updateMany({
      where: { campaignId, status: 'PENDING' },
      data: { status: 'SKIPPED' },
    });

    return this.prisma.outboundCampaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Get campaign by ID with calls
   */
  async getCampaign(campaignId: string) {
    return this.prisma.outboundCampaign.findUnique({
      where: { id: campaignId },
      include: {
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });
  }

  /**
   * List campaigns for a tenant
   */
  async listCampaigns(
    tenantId: string,
    options?: { status?: OutboundCampaignStatus; limit?: number },
  ) {
    return this.prisma.outboundCampaign.findMany({
      where: {
        tenantId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      include: {
        _count: { select: { calls: true } },
      },
    });
  }

  /**
   * Update call result after execution
   */
  async updateCallResult(
    callId: string,
    result: {
      status: 'COMPLETED' | 'FAILED';
      vapiCallId?: string;
      outcome?: string;
      notes?: string;
    },
  ) {
    const call = await this.prisma.outboundCall.update({
      where: { id: callId },
      data: {
        status: result.status,
        vapiCallId: result.vapiCallId,
        outcome: result.outcome,
        notes: result.notes,
        completedAt: new Date(),
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    // Update campaign counters
    const updateField = result.status === 'COMPLETED' ? 'successCount' : 'failureCount';
    await this.prisma.outboundCampaign.update({
      where: { id: call.campaignId },
      data: { [updateField]: { increment: 1 } },
    });

    // Check if campaign is complete
    await this.checkCampaignCompletion(call.campaignId);

    return call;
  }

  private async checkCampaignCompletion(campaignId: string) {
    const campaign = await this.prisma.outboundCampaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: {
            calls: { where: { status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] } } },
          },
        },
      },
    });

    if (campaign && campaign._count.calls === 0 && campaign.status === 'IN_PROGRESS') {
      await this.prisma.outboundCampaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      this.logger.log(`Campaign ${campaignId} completed`);
    }
  }

  /**
   * Cron job to process scheduled campaigns
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledCampaigns() {
    const now = new Date();

    const scheduledCampaigns = await this.prisma.outboundCampaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
      },
    });

    for (const campaign of scheduledCampaigns) {
      this.logger.log(`Auto-starting scheduled campaign: ${campaign.id}`);
      await this.startCampaign(campaign.id);
    }
  }

  // Template methods
  private getAppointmentReminderTemplate(): string {
    return `Hi, this is a friendly reminder about your upcoming appointment.
We're looking forward to seeing you. If you need to reschedule or have any questions,
please let me know now, or you can call us back. Is there anything you'd like to confirm or change?`;
  }

  private getFollowUpSurveyTemplate(): string {
    return `Hi, this is a quick follow-up call about the service we recently provided.
We hope everything went well! On a scale of 1 to 10, how would you rate your experience with us?
Your feedback helps us improve our service.`;
  }
}
