import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { SegmentsService } from '../segments/segments.service';
import { CampaignStatus, CampaignType } from '@prisma/client';

export interface CampaignJobData {
  campaignId: string;
  tenantId: string;
  action: 'send' | 'send_step';
  stepNumber?: number;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly segmentsService: SegmentsService,
    @InjectQueue('marketing-campaigns')
    private readonly campaignQueue: Queue<CampaignJobData>,
  ) {}

  async create(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      type: CampaignType;
      audienceSegmentId?: string;
      channel?: string;
      subject?: string;
      content?: string;
      senderName?: string;
      scheduledAt?: Date;
      isAbTest?: boolean;
      variants?: Record<string, unknown>;
      createdBy?: string;
    },
  ) {
    // Validate segment if provided
    if (data.audienceSegmentId) {
      await this.segmentsService.findOne(tenantId, data.audienceSegmentId);
    }

    return this.prisma.marketingCampaign.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        type: data.type,
        audienceSegmentId: data.audienceSegmentId,
        channel: data.channel,
        subject: data.subject,
        content: data.content,
        senderName: data.senderName,
        scheduledAt: data.scheduledAt,
        isAbTest: data.isAbTest ?? false,
        variants: data.variants as any,
        createdBy: data.createdBy,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: { status?: CampaignStatus; type?: CampaignType },
  ) {
    return this.prisma.marketingCampaign.findMany({
      where: {
        tenantId,
        status: filters?.status,
        type: filters?.type,
      },
      include: {
        segment: { select: { id: true, name: true, memberCount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.prisma.marketingCampaign.findFirst({
      where: { id, tenantId },
      include: {
        segment: true,
        steps: { orderBy: { stepNumber: 'asc' } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      audienceSegmentId?: string;
      channel?: string;
      subject?: string;
      content?: string;
      senderName?: string;
      scheduledAt?: Date;
    },
  ) {
    const campaign = await this.findOne(tenantId, id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Can only update draft campaigns');
    }

    return this.prisma.marketingCampaign.update({
      where: { id },
      data,
    });
  }

  async delete(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active campaign');
    }

    return this.prisma.marketingCampaign.delete({ where: { id } });
  }

  async schedule(tenantId: string, id: string, scheduledAt: Date) {
    const campaign = await this.findOne(tenantId, id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Can only schedule draft campaigns');
    }

    await this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: CampaignStatus.SCHEDULED, scheduledAt },
    });

    // Calculate delay until scheduled time
    const delay = scheduledAt.getTime() - Date.now();

    await this.campaignQueue.add(
      'send-campaign',
      { campaignId: id, tenantId, action: 'send' },
      { delay: Math.max(delay, 0), jobId: `campaign-${id}` },
    );

    return this.findOne(tenantId, id);
  }

  async sendNow(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Campaign cannot be sent');
    }

    await this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE, startedAt: new Date() },
    });

    await this.campaignQueue.add(
      'send-campaign',
      { campaignId: id, tenantId, action: 'send' },
      { jobId: `campaign-${id}` },
    );

    return this.findOne(tenantId, id);
  }

  async pause(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Can only pause active campaigns');
    }

    return this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });
  }

  async resume(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Can only resume paused campaigns');
    }

    await this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
    });

    // Continue processing
    await this.campaignQueue.add(
      'send-campaign',
      { campaignId: id, tenantId, action: 'send' },
      { jobId: `campaign-${id}-resume-${Date.now()}` },
    );

    return this.findOne(tenantId, id);
  }

  async cancel(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed campaign');
    }

    // Remove scheduled job if exists
    await this.campaignQueue.remove(`campaign-${id}`);

    return this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
    });
  }

  async getStats(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);

    const openRate = campaign.sentCount > 0
      ? (campaign.openCount / campaign.sentCount) * 100
      : 0;

    const clickRate = campaign.openCount > 0
      ? (campaign.clickCount / campaign.openCount) * 100
      : 0;

    const conversionRate = campaign.sentCount > 0
      ? (campaign.conversionCount / campaign.sentCount) * 100
      : 0;

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        type: campaign.type,
      },
      metrics: {
        totalRecipients: campaign.totalRecipients,
        sent: campaign.sentCount,
        delivered: campaign.deliveredCount,
        opened: campaign.openCount,
        clicked: campaign.clickCount,
        conversions: campaign.conversionCount,
        revenue: campaign.revenue,
        unsubscribes: campaign.unsubscribeCount,
        bounces: campaign.bounceCount,
      },
      rates: {
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
    };
  }

  async addStep(
    tenantId: string,
    campaignId: string,
    data: {
      stepNumber: number;
      name?: string;
      delayDays?: number;
      delayHours?: number;
      channel: string;
      subject?: string;
      content: string;
      conditions?: Record<string, unknown>;
    },
  ) {
    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.type !== CampaignType.DRIP_SEQUENCE) {
      throw new BadRequestException('Steps only supported for drip sequences');
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Can only add steps to draft campaigns');
    }

    return this.prisma.campaignStep.create({
      data: {
        campaignId,
        stepNumber: data.stepNumber,
        name: data.name,
        delayDays: data.delayDays ?? 0,
        delayHours: data.delayHours ?? 0,
        channel: data.channel,
        subject: data.subject,
        content: data.content,
        conditions: data.conditions as any,
      },
    });
  }

  async updateRecipientStatus(
    recipientId: string,
    status: string,
    additionalData?: {
      conversionValue?: number;
      conversionType?: string;
    },
  ) {
    const now = new Date();
    const updateData: Record<string, unknown> = { status };

    if (status === 'SENT') updateData.sentAt = now;
    if (status === 'DELIVERED') updateData.deliveredAt = now;
    if (status === 'OPENED') updateData.openedAt = now;
    if (status === 'CLICKED') updateData.clickedAt = now;
    if (status === 'CONVERTED') {
      updateData.convertedAt = now;
      if (additionalData?.conversionValue) {
        updateData.conversionValue = additionalData.conversionValue;
      }
      if (additionalData?.conversionType) {
        updateData.conversionType = additionalData.conversionType;
      }
    }
    if (status === 'UNSUBSCRIBED') updateData.unsubscribedAt = now;

    return this.prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: updateData,
    });
  }
}
