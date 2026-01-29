import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ActionType, ActionStatus, AIAction } from '@prisma/client';
import { CampaignsService } from '../marketing/campaigns/campaigns.service';
import { SegmentsService } from '../marketing/segments/segments.service';
import { SegmentRules } from '../marketing/segments/segment-rules.engine';
import { SmsService } from '../sms/sms.service';

export interface CreateActionDto {
  actionType: ActionType;
  title: string;
  description: string;
  params: Record<string, unknown>;
  insightId?: string;
  copilotSessionId?: string;
  estimatedImpact?: string;
  riskLevel?: string;
  requiresApproval?: boolean;
  expiresAt?: Date;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type ActionHandler = (
  tenantId: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  private readonly handlers: Record<ActionType, ActionHandler> = {
    CREATE_CAMPAIGN: this.executeCreateCampaign.bind(this),
    SEND_SMS: this.executeSendSms.bind(this),
    SEND_EMAIL: this.executeSendEmail.bind(this),
    SCHEDULE_APPOINTMENT: this.executeScheduleAppointment.bind(this),
    CREATE_QUOTE: this.executeCreateQuote.bind(this),
    APPLY_DISCOUNT: this.executeApplyDiscount.bind(this),
    SCHEDULE_FOLLOW_UP: this.executeScheduleFollowUp.bind(this),
    CREATE_SEGMENT: this.executeCreateSegment.bind(this),
  };

  // Default approval requirements by action type
  private readonly approvalDefaults: Record<ActionType, boolean> = {
    CREATE_CAMPAIGN: true,
    SEND_SMS: true,
    SEND_EMAIL: true,
    SCHEDULE_APPOINTMENT: true,
    CREATE_QUOTE: true,
    APPLY_DISCOUNT: true,
    SCHEDULE_FOLLOW_UP: false, // Low risk, can auto-execute
    CREATE_SEGMENT: false, // Just organizing data
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
    private readonly segmentsService: SegmentsService,
    private readonly smsService: SmsService,
    @InjectQueue('ai-actions') private readonly actionQueue: Queue,
  ) {}

  async createAction(
    tenantId: string,
    data: CreateActionDto,
  ): Promise<AIAction> {
    const requiresApproval =
      data.requiresApproval ?? this.approvalDefaults[data.actionType];

    const action = await this.prisma.aIAction.create({
      data: {
        tenantId,
        actionType: data.actionType,
        title: data.title,
        description: data.description,
        params: data.params as Prisma.InputJsonValue,
        insightId: data.insightId,
        copilotSessionId: data.copilotSessionId,
        estimatedImpact: data.estimatedImpact,
        riskLevel: data.riskLevel ?? 'LOW',
        requiresApproval,
        status: requiresApproval ? 'PENDING' : 'APPROVED',
        expiresAt: data.expiresAt,
      },
    });

    this.logger.log(
      `Created action ${action.id} (${action.actionType}) - requires approval: ${requiresApproval}`,
    );

    // If no approval needed, queue immediately
    if (!requiresApproval) {
      await this.queueExecution(action.id);
    }

    return action;
  }

  async listActions(
    tenantId: string,
    filters?: { status?: ActionStatus; limit?: number },
  ): Promise<AIAction[]> {
    return this.prisma.aIAction.findMany({
      where: {
        tenantId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
    });
  }

  async getAction(tenantId: string, actionId: string): Promise<AIAction> {
    const action = await this.prisma.aIAction.findFirst({
      where: { id: actionId, tenantId },
    });

    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    return action;
  }

  async approveAction(
    tenantId: string,
    actionId: string,
    userId: string,
  ): Promise<AIAction> {
    const action = await this.getAction(tenantId, actionId);

    if (action.status !== 'PENDING') {
      throw new Error(`Action ${actionId} is not pending (status: ${action.status})`);
    }

    const updated = await this.prisma.aIAction.update({
      where: { id: actionId },
      data: {
        status: 'APPROVED',
        executedBy: userId,
      },
    });

    this.logger.log(`Action ${actionId} approved by ${userId}`);

    await this.queueExecution(actionId);
    return updated;
  }

  async cancelAction(
    tenantId: string,
    actionId: string,
    userId: string,
  ): Promise<AIAction> {
    const action = await this.getAction(tenantId, actionId);

    if (action.status !== 'PENDING') {
      throw new Error(`Action ${actionId} is not pending (status: ${action.status})`);
    }

    return this.prisma.aIAction.update({
      where: { id: actionId },
      data: {
        status: 'CANCELLED',
        executedBy: userId,
      },
    });
  }

  async queueExecution(actionId: string): Promise<void> {
    await this.actionQueue.add(
      'execute',
      { actionId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Action ${actionId} queued for execution`);
  }

  async executeAction(actionId: string): Promise<ActionResult> {
    const action = await this.prisma.aIAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    if (action.status !== 'APPROVED') {
      throw new Error(`Action ${actionId} is not approved (status: ${action.status})`);
    }

    // Mark as executing
    await this.prisma.aIAction.update({
      where: { id: actionId },
      data: { status: 'EXECUTING' },
    });

    try {
      const handler = this.handlers[action.actionType];
      if (!handler) {
        throw new Error(`No handler for action type: ${action.actionType}`);
      }

      const params = action.params as Record<string, unknown>;
      const result = await handler(action.tenantId, params);

      // Mark as completed
      await this.prisma.aIAction.update({
        where: { id: actionId },
        data: {
          status: 'COMPLETED',
          executedAt: new Date(),
          result: result as object,
        },
      });

      this.logger.log(`Action ${actionId} completed successfully`);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark as failed
      await this.prisma.aIAction.update({
        where: { id: actionId },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      });

      this.logger.error(`Action ${actionId} failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  // ========================================
  // Action Handlers
  // ========================================

  private async executeCreateCampaign(
    tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    return this.campaignsService.create(tenantId, {
      name: params.name as string,
      type: params.type as 'SMS_BLAST' | 'EMAIL_BLAST' | 'DRIP_SEQUENCE' | 'REFERRAL' | 'SEASONAL',
      channel: params.channel as string,
      content: params.content as string,
      subject: params.subject as string | undefined,
      audienceSegmentId: params.segmentId as string | undefined,
      scheduledAt: params.scheduledAt ? new Date(params.scheduledAt as string) : undefined,
      createdBy: 'ai-action',
    });
  }

  private async executeSendSms(
    tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const phone = params.phone as string;
    const message = params.message as string;

    await this.smsService.sendSms(phone, message);

    return { sent: true, phone, messageLength: message.length };
  }

  private async executeSendEmail(
    _tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // TODO: Integrate with email service
    this.logger.log(`Would send email to ${params.email}: ${params.subject}`);
    return { sent: true, email: params.email };
  }

  private async executeScheduleAppointment(
    _tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // TODO: Integrate with appointments service
    this.logger.log(`Would schedule appointment: ${JSON.stringify(params)}`);
    return { scheduled: true, ...params };
  }

  private async executeCreateQuote(
    _tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // TODO: Integrate with quotes service
    this.logger.log(`Would create quote: ${JSON.stringify(params)}`);
    return { created: true, ...params };
  }

  private async executeApplyDiscount(
    _tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // TODO: Integrate with quotes service
    this.logger.log(`Would apply ${params.discountPercent}% discount to quote ${params.quoteId}`);
    return { applied: true, ...params };
  }

  private async executeScheduleFollowUp(
    _tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // TODO: Integrate with follow-up scheduling
    this.logger.log(`Would schedule follow-up: ${JSON.stringify(params)}`);
    return { scheduled: true, ...params };
  }

  private async executeCreateSegment(
    tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    return this.segmentsService.create(tenantId, {
      name: params.name as string,
      description: params.description as string | undefined,
      rules: params.rules as SegmentRules,
      createdBy: 'ai-action',
    });
  }

  // ========================================
  // Utility Methods
  // ========================================

  async createFromInsight(
    tenantId: string,
    insightId: string,
    userId: string,
  ): Promise<AIAction> {
    const insight = await this.prisma.agentInsight.findFirst({
      where: { id: insightId, tenantId },
    });

    if (!insight) {
      throw new NotFoundException(`Insight ${insightId} not found`);
    }

    const actionParams = insight.actionParams as Record<string, unknown> || {};

    // Map insight type to action type
    const actionTypeMap: Record<string, ActionType> = {
      follow_up_urgency: 'SEND_SMS',
      unopened_quote: 'SEND_SMS',
      high_value_aging: 'SEND_SMS',
      churn_risk: 'SEND_SMS',
      no_show_risk: 'SEND_SMS',
      campaign_suggestion: 'CREATE_CAMPAIGN',
      segment_suggestion: 'CREATE_SEGMENT',
    };

    const actionType = actionTypeMap[insight.insightType] || 'SEND_SMS';

    const action = await this.createAction(tenantId, {
      actionType,
      title: insight.title,
      description: insight.recommendedAction,
      params: actionParams,
      insightId,
      requiresApproval: false, // Already approved by marking insight as approved
    });

    // Update insight status
    await this.prisma.agentInsight.update({
      where: { id: insightId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: userId,
      },
    });

    return action;
  }

  async getPendingCount(tenantId: string): Promise<number> {
    return this.prisma.aIAction.count({
      where: { tenantId, status: 'PENDING' },
    });
  }

  async expireOldActions(): Promise<number> {
    const result = await this.prisma.aIAction.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'CANCELLED' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} old actions`);
    }

    return result.count;
  }
}
