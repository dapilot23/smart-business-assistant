import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VoiceService } from '../voice/voice.service';
import {
  OutboundCampaignsService,
  OUTBOUND_CAMPAIGN_QUEUE,
  CampaignCallJob,
} from './outbound-campaigns.service';
import { PrismaService } from '../../config/prisma/prisma.service';

@Processor(OUTBOUND_CAMPAIGN_QUEUE)
export class OutboundCampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundCampaignsProcessor.name);

  constructor(
    private readonly voiceService: VoiceService,
    private readonly campaignsService: OutboundCampaignsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<CampaignCallJob>): Promise<void> {
    const { campaignId, callId, customerId, customerPhone, tenantId, template } = job.data;

    this.logger.log(`Processing outbound call ${callId} for campaign ${campaignId}`);

    try {
      // Check if campaign is still active
      const campaign = await this.prisma.outboundCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign || campaign.status === 'CANCELLED' || campaign.status === 'PAUSED') {
        this.logger.log(`Campaign ${campaignId} is not active, skipping call ${callId}`);
        await this.campaignsService.updateCallResult(callId, {
          status: 'FAILED',
          outcome: 'campaign_cancelled',
          notes: `Campaign status: ${campaign?.status || 'not found'}`,
        });
        return;
      }

      // Update call status to in progress
      await this.prisma.outboundCall.update({
        where: { id: callId },
        data: { status: 'IN_PROGRESS', lastAttemptAt: new Date() },
      });

      // Get customer info for personalization
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      // Prepare call metadata
      const metadata = {
        tenantId,
        customerId,
        campaignId,
        callId,
        campaignType: campaign.type,
        customerName: customer?.name,
      };

      // Make the outbound call via Vapi
      const vapiCall = await this.voiceService.makeOutboundCall(
        {
          phoneNumber: customerPhone,
          metadata,
        },
        tenantId,
      );

      const vapiCallId = (vapiCall as any)?.id;

      this.logger.log(`Outbound call initiated: ${vapiCallId} for customer ${customerId}`);

      // Update call with Vapi call ID
      await this.campaignsService.updateCallResult(callId, {
        status: 'COMPLETED',
        vapiCallId,
        outcome: 'call_initiated',
      });
    } catch (error) {
      this.logger.error(`Failed to process outbound call ${callId}: ${error.message}`);

      await this.campaignsService.updateCallResult(callId, {
        status: 'FAILED',
        outcome: 'error',
        notes: error.message,
      });

      // Re-throw to trigger retry if attempts remaining
      throw error;
    }
  }
}
