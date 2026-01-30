import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ActionType, ActionStatus, AIAction } from '@prisma/client';
import { CampaignsService } from '../marketing/campaigns/campaigns.service';
import { SegmentsService } from '../marketing/segments/segments.service';
import { SegmentRules } from '../marketing/segments/segment-rules.engine';
import { SmsService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { QuotesService } from '../quotes/quotes.service';
import { QuoteFollowupService } from '../quotes/quote-followup.service';
import { toNum } from '../../common/utils/decimal';

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
    private readonly emailService: EmailService,
    private readonly appointmentsService: AppointmentsService,
    private readonly quotesService: QuotesService,
    private readonly quoteFollowupService: QuoteFollowupService,
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
    const action = await this.prisma.withSystemContext(() =>
      this.prisma.aIAction.findUnique({
        where: { id: actionId },
      }),
    );

    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    return this.prisma.withTenantContext(action.tenantId, async () => {
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
    });
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
    const actionType = params.type as string | undefined;

    if (actionType === 'appointment_confirmation') {
      const targetDate = params.targetDate as string | undefined;
      const baseDate = targetDate ? new Date(targetDate) : new Date();
      const start = new Date(baseDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          tenantId,
          status: 'SCHEDULED',
          scheduledAt: { gte: start, lt: end },
        },
        include: { customer: true, service: true },
        orderBy: { scheduledAt: 'asc' },
      });

      let sent = 0;
      let skipped = 0;

      for (const appointment of appointments) {
        if (!appointment.customer?.phone) {
          skipped += 1;
          continue;
        }

        const formattedDate = appointment.scheduledAt.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        const formattedTime = appointment.scheduledAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        const message =
          `Hi ${appointment.customer.name}, just confirming your ` +
          `${appointment.service?.name || 'appointment'} on ${formattedDate} at ${formattedTime}. ` +
          `Reply YES to confirm.`;

        const result = await this.smsService.sendSms(
          appointment.customer.phone,
          message,
          { tenantId },
        );
        if (result?.skipped) {
          skipped += 1;
          continue;
        }
        sent += 1;
      }

      return { sent, skipped, targetDate: start.toISOString() };
    }

    let phone = params.phone as string | undefined;
    const message = params.message as string | undefined;

    if (!phone && params.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: params.customerId as string, tenantId },
        select: { phone: true },
      });
      phone = customer?.phone || undefined;
    }

    if (!phone || !message) {
      throw new BadRequestException('Missing phone or message for SMS action');
    }

    const result = await this.smsService.sendSms(phone, message, { tenantId });

    if (result?.skipped) {
      return { sent: false, skipped: true, phone };
    }

    return { sent: true, phone, messageLength: message.length };
  }

  private async executeSendEmail(
    tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const actionType = params.type as string | undefined;
    const subject = (params.subject as string | undefined) || 'Notification';
    const html = params.html as string | undefined;
    const message = params.message as string | undefined;

    if (actionType === 'payment_reminder') {
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: { tenantId, status: 'OVERDUE' },
        include: { customer: true },
      });

      let sent = 0;
      let skipped = 0;

      for (const invoice of overdueInvoices) {
        if (!invoice.customer?.email) {
          skipped += 1;
          continue;
        }

        const outstanding =
          toNum(invoice.amount) - toNum(invoice.paidAmount);
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'usd',
        }).format(outstanding);

        const reminderSubject = `Payment Reminder - ${invoice.invoiceNumber}`;
        const reminderMessage =
          `Hi ${invoice.customer.name}, your invoice ${invoice.invoiceNumber} ` +
          `for ${formatted} is overdue. Please submit payment at your earliest convenience.`;

        const sent = await this.emailService.sendCustomEmail({
          to: invoice.customer.email,
          subject: reminderSubject,
          text: reminderMessage,
          tenantId,
        });
        if (!sent) {
          skipped += 1;
          continue;
        }
        sent += 1;
      }

      return { sent, skipped, type: actionType };
    }

    let email = params.email as string | undefined;

    if (!email && params.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: params.customerId as string, tenantId },
        select: { email: true },
      });
      email = customer?.email || undefined;
    }

    if (!email && params.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: params.invoiceId as string, tenantId },
        include: { customer: true },
      });
      email = invoice?.customer?.email || undefined;
    }

    if (!email) {
      throw new BadRequestException('Missing email for SEND_EMAIL action');
    }

    if (!html && !message) {
      throw new BadRequestException('Missing email content for SEND_EMAIL action');
    }

    const sent = await this.emailService.sendCustomEmail({
      to: email,
      subject,
      html,
      text: message,
      tenantId,
    });

    if (!sent) {
      return { sent: false, skipped: true, email };
    }

    return { sent: true, email };
  }

  private async executeScheduleAppointment(
    tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const customerId = params.customerId as string | undefined;
    const scheduledAt = params.scheduledAt as string | undefined;

    if (!customerId || !scheduledAt) {
      throw new BadRequestException('Missing customerId or scheduledAt');
    }

    const appointment = await this.appointmentsService.create(tenantId, {
      customerId,
      serviceId: params.serviceId as string | undefined,
      assignedTo: params.assignedTo as string | undefined,
      scheduledAt,
      duration: params.duration ? Number(params.duration) : undefined,
      notes: params.notes as string | undefined,
    });

    return { scheduled: true, appointmentId: appointment.id };
  }

  private async executeCreateQuote(
    tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const customerId = params.customerId as string | undefined;
    if (!customerId) {
      throw new BadRequestException('Missing customerId for quote');
    }

    const description = (params.description as string | undefined) || 'Service Quote';
    const validUntil =
      (params.validUntil as string | undefined) ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    let items = params.items as Array<Record<string, unknown>> | undefined;

    if (!items || items.length === 0) {
      const amount = Number(params.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Missing quote amount or items');
      }
      items = [
        {
          description,
          quantity: 1,
          unitPrice: amount,
          total: amount,
        },
      ];
    }

    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.total ?? params.amount ?? 0);
      const total = Number(item.total ?? unitPrice * quantity);

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(unitPrice) ||
        !Number.isFinite(total) ||
        quantity <= 0 ||
        unitPrice <= 0 ||
        total <= 0
      ) {
        throw new BadRequestException('Invalid quote item values');
      }

      return {
        description: String(item.description ?? description),
        quantity,
        unitPrice: this.roundCurrency(unitPrice),
        total: this.roundCurrency(total),
      };
    });

    const quote = await this.quotesService.create(
      {
        customerId,
        description,
        amount: normalizedItems.reduce((sum, item) => sum + item.total, 0),
        validUntil,
        items: normalizedItems,
        notes: params.notes as string | undefined,
      },
      tenantId,
    );

    return { created: true, quoteId: quote.id };
  }

  private async executeApplyDiscount(
    tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const quoteId = params.quoteId as string | undefined;
    const discountPercent = Number(params.discountPercent);

    if (!quoteId) {
      throw new BadRequestException('Missing quoteId for discount');
    }
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
      throw new BadRequestException('Invalid discountPercent');
    }

    const quote = await this.quotesService.findOne(quoteId, tenantId);
    const factor = 1 - discountPercent / 100;

    const discountedItems = quote.items.map((item) => {
      const unitPrice = this.roundCurrency(toNum(item.unitPrice) * factor);
      const total = this.roundCurrency(unitPrice * item.quantity);
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice,
        total,
      };
    });

    const updated = await this.quotesService.update(
      quoteId,
      { items: discountedItems },
      tenantId,
    );

    return {
      applied: true,
      quoteId,
      discountPercent,
      newAmount: updated.amount,
    };
  }

  private async executeScheduleFollowUp(
    tenantId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const quoteId = params.quoteId as string | undefined;

    if (!quoteId) {
      return { scheduled: false, reason: 'quoteId is required for follow-up scheduling' };
    }

    await this.quoteFollowupService.scheduleFollowUps(tenantId, quoteId);
    return { scheduled: true, quoteId };
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

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
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
