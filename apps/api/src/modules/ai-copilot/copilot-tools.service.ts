import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ActionExecutorService } from '../ai-actions/action-executor.service';
import { Decimal } from '@prisma/client/runtime/library';
import { ToolDefinition } from '../ai-engine/ai-engine.service';

@Injectable()
export class CopilotToolsService {
  private readonly logger = new Logger(CopilotToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionExecutor: ActionExecutorService,
  ) {}

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'get_revenue_summary',
        description: 'Get revenue totals by date range with optional grouping',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date ISO string' },
            endDate: { type: 'string', description: 'End date ISO string' },
            groupBy: { type: 'string', enum: ['day', 'week', 'month'] },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_appointment_stats',
        description: 'Get appointment counts, completion rates, no-show rates',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            technicianId: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_customer_list',
        description: 'Get customers filtered by status (active, dormant, at_risk)',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['active', 'dormant', 'at_risk'] },
            sortBy: { type: 'string', enum: ['clv', 'last_visit', 'spend'] },
            limit: { type: 'number' },
          },
        },
      },
      {
        name: 'get_technician_performance',
        description: 'Get performance metrics per technician',
        inputSchema: {
          type: 'object',
          properties: {
            technicianId: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_quote_pipeline',
        description: 'Get quote conversion funnel metrics',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_invoice_aging',
        description: 'Get outstanding invoices grouped by age buckets',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_service_profitability',
        description: 'Get revenue and margin by service type',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_customer_satisfaction',
        description: 'Get NPS scores and review ratings',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_retention_metrics',
        description: 'Get churn rate, dormant count, CLV distribution',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_schedule_utilization',
        description: 'Get technician utilization and capacity',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      // ========================================
      // Write Tools (Create Actions)
      // ========================================
      {
        name: 'create_campaign',
        description: 'Create a marketing campaign (SMS, email, referral, seasonal). Returns a pending action for user approval.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Campaign name' },
            type: { type: 'string', enum: ['SMS_BLAST', 'EMAIL_BLAST', 'DRIP_SEQUENCE', 'REFERRAL', 'SEASONAL'] },
            message: { type: 'string', description: 'Campaign message content' },
            subject: { type: 'string', description: 'Email subject (for email campaigns)' },
            targetSegment: { type: 'string', description: 'Target audience description' },
            scheduledAt: { type: 'string', description: 'When to send (ISO date) or "immediately"' },
          },
          required: ['name', 'type', 'message'],
        },
      },
      {
        name: 'send_sms_to_customer',
        description: 'Send an SMS message to a specific customer. Returns a pending action for user confirmation.',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'Customer ID to send to' },
            customerName: { type: 'string', description: 'Customer name (for display)' },
            message: { type: 'string', description: 'SMS message content (max 160 chars recommended)' },
          },
          required: ['customerId', 'message'],
        },
      },
      {
        name: 'create_segment',
        description: 'Create a customer segment based on rules. Returns a pending action for user approval.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Segment name' },
            description: { type: 'string', description: 'Segment description' },
            conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', enum: ['healthScore', 'churnRisk', 'lifecycleStage', 'totalSpent', 'daysSinceLastVisit'] },
                  operator: { type: 'string', enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
                  value: { type: ['string', 'number'] },
                },
              },
            },
            logic: { type: 'string', enum: ['AND', 'OR'], default: 'AND' },
          },
          required: ['name', 'conditions'],
        },
      },
      {
        name: 'schedule_follow_up',
        description: 'Schedule a follow-up for a quote or customer. Returns a pending action for user confirmation.',
        inputSchema: {
          type: 'object',
          properties: {
            quoteId: { type: 'string', description: 'Quote ID to follow up on' },
            customerId: { type: 'string', description: 'Customer ID' },
            method: { type: 'string', enum: ['call', 'sms', 'email'], description: 'Follow-up method' },
            scheduledFor: { type: 'string', description: 'When to follow up (ISO date)' },
            notes: { type: 'string', description: 'Notes for the follow-up' },
          },
          required: ['method'],
        },
      },
      {
        name: 'apply_discount',
        description: 'Apply a discount to an existing quote. Returns a pending action for user approval.',
        inputSchema: {
          type: 'object',
          properties: {
            quoteId: { type: 'string', description: 'Quote ID to discount' },
            discountPercent: { type: 'number', description: 'Discount percentage (e.g., 10 for 10%)' },
            reason: { type: 'string', description: 'Reason for discount' },
          },
          required: ['quoteId', 'discountPercent'],
        },
      },
    ];
  }

  async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    tenantId: string,
  ): Promise<unknown> {
    this.logger.debug(`Executing tool: ${toolName} with params: ${JSON.stringify(params)}`);

    switch (toolName) {
      case 'get_revenue_summary':
        return this.getRevenueSummary(params, tenantId);
      case 'get_appointment_stats':
        return this.getAppointmentStats(params, tenantId);
      case 'get_customer_list':
        return this.getCustomerList(params, tenantId);
      case 'get_technician_performance':
        return this.getTechnicianPerformance(params, tenantId);
      case 'get_quote_pipeline':
        return this.getQuotePipeline(params, tenantId);
      case 'get_invoice_aging':
        return this.getInvoiceAging(tenantId);
      case 'get_service_profitability':
        return this.getServiceProfitability(params, tenantId);
      case 'get_customer_satisfaction':
        return this.getCustomerSatisfaction(params, tenantId);
      case 'get_retention_metrics':
        return this.getRetentionMetrics(tenantId);
      case 'get_schedule_utilization':
        return this.getScheduleUtilization(params, tenantId);
      // Write tools
      case 'create_campaign':
        return this.createCampaignAction(params, tenantId);
      case 'send_sms_to_customer':
        return this.sendSmsAction(params, tenantId);
      case 'create_segment':
        return this.createSegmentAction(params, tenantId);
      case 'schedule_follow_up':
        return this.scheduleFollowUpAction(params, tenantId);
      case 'apply_discount':
        return this.applyDiscountAction(params, tenantId);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async getRevenueSummary(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const startDate = new Date(params.startDate as string);
    const endDate = new Date(params.endDate as string);
    const groupBy = (params.groupBy as string) || 'day';

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        paidAt: { gte: startDate, lte: endDate },
        status: 'PAID',
      },
      select: { paidAt: true, paidAmount: true },
    });

    const total = invoices.reduce(
      (sum, inv) => sum + this.toNumber(inv.paidAmount),
      0,
    );

    const breakdown = this.groupRevenue(invoices, groupBy);

    return { total, breakdown, period: { startDate, endDate }, groupBy };
  }

  private async getAppointmentStats(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const startDate = new Date(params.startDate as string);
    const endDate = new Date(params.endDate as string);
    const technicianId = params.technicianId as string | undefined;

    const where: Record<string, unknown> = {
      tenantId,
      scheduledAt: { gte: startDate, lte: endDate },
    };
    if (technicianId) where.assignedTo = technicianId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: { status: true },
    });

    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
    const noShows = appointments.filter((a) => a.status === 'NO_SHOW').length;
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;

    return {
      total,
      completed,
      noShows,
      cancelled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShows / total) * 100) : 0,
    };
  }

  private async getCustomerList(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const status = params.status as string | undefined;
    const sortBy = params.sortBy as string | undefined;
    const limit = (params.limit as number) || 20;

    const where: Record<string, unknown> = { tenantId };

    if (status === 'at_risk') {
      where.churnRisk = { gte: 0.5 };
    } else if (status === 'dormant') {
      where.lifecycleStage = 'dormant';
    } else if (status === 'active') {
      where.lifecycleStage = 'active';
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: { context: true },
      take: limit,
      orderBy: sortBy === 'clv' ? { healthScore: 'desc' } : { updatedAt: 'desc' },
    });

    return {
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        healthScore: c.healthScore,
        churnRisk: c.churnRisk,
        lifecycleStage: c.lifecycleStage,
        totalSpent: (c as any).context?.totalSpent ?? 0,
      })),
      count: customers.length,
    };
  }

  private async getTechnicianPerformance(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const startDate = new Date(params.startDate as string);
    const endDate = new Date(params.endDate as string);
    const technicianId = params.technicianId as string | undefined;

    const jobs = await this.prisma.job.findMany({
      where: {
        tenantId,
        completedAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
        ...(technicianId && { technicianId }),
      },
      include: { technician: { select: { id: true, name: true } } },
    });

    const byTechnician = new Map<string, { name: string; jobCount: number }>();
    for (const job of jobs) {
      if (!job.technicianId || !job.technician) continue;
      const existing = byTechnician.get(job.technicianId) || {
        name: job.technician.name,
        jobCount: 0,
      };
      existing.jobCount++;
      byTechnician.set(job.technicianId, existing);
    }

    return {
      technicians: Array.from(byTechnician.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        jobsCompleted: data.jobCount,
      })),
      totalJobs: jobs.length,
    };
  }

  private async getQuotePipeline(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const startDate = new Date(params.startDate as string);
    const endDate = new Date(params.endDate as string);

    const quotes = await this.prisma.quote.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { status: true, amount: true },
    });

    const total = quotes.length;
    const sent = quotes.filter((q) => q.status !== 'DRAFT').length;
    const accepted = quotes.filter((q) => q.status === 'ACCEPTED').length;
    const rejected = quotes.filter((q) => q.status === 'REJECTED').length;
    const expired = quotes.filter((q) => q.status === 'EXPIRED').length;
    const pending = quotes.filter((q) => q.status === 'SENT').length;

    const acceptedValue = quotes
      .filter((q) => q.status === 'ACCEPTED')
      .reduce((sum, q) => sum + this.toNumber(q.amount), 0);
    const pendingValue = quotes
      .filter((q) => q.status === 'SENT')
      .reduce((sum, q) => sum + this.toNumber(q.amount), 0);

    return {
      total,
      sent,
      accepted,
      rejected,
      expired,
      pending,
      conversionRate: sent > 0 ? Math.round((accepted / sent) * 100) : 0,
      acceptedValue,
      pendingValue,
    };
  }

  private async getInvoiceAging(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'OVERDUE'] },
      },
      select: { dueDate: true, amount: true, paidAmount: true },
    });

    const now = new Date();
    let current = 0,
      thirtyDays = 0,
      sixtyDays = 0,
      ninetyPlus = 0;

    for (const inv of invoices) {
      const outstanding = this.toNumber(inv.amount) - this.toNumber(inv.paidAmount);
      if (outstanding <= 0) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysOverdue < 0) current += outstanding;
      else if (daysOverdue < 30) thirtyDays += outstanding;
      else if (daysOverdue < 60) sixtyDays += outstanding;
      else ninetyPlus += outstanding;
    }

    return {
      current: Math.round(current * 100) / 100,
      thirtyDays: Math.round(thirtyDays * 100) / 100,
      sixtyDays: Math.round(sixtyDays * 100) / 100,
      ninetyPlus: Math.round(ninetyPlus * 100) / 100,
      total: Math.round((current + thirtyDays + sixtyDays + ninetyPlus) * 100) / 100,
    };
  }

  private async getServiceProfitability(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const startDate = new Date(params.startDate as string);
    const endDate = new Date(params.endDate as string);

    const jobs = await this.prisma.job.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: endDate },
      },
      include: {
        appointment: { include: { service: true } },
      },
    });

    const byService = new Map<string, { name: string; revenue: number; jobCount: number }>();

    for (const job of jobs) {
      const service = job.appointment?.service;
      if (!service) continue;

      const existing = byService.get(service.id) || {
        name: service.name,
        revenue: 0,
        jobCount: 0,
      };
      existing.revenue += this.toNumber(service.price);
      existing.jobCount++;
      byService.set(service.id, existing);
    }

    return {
      services: Array.from(byService.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          revenue: Math.round(data.revenue * 100) / 100,
          jobCount: data.jobCount,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  private async getCustomerSatisfaction(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const startDate = new Date(params.startDate as string);
    const endDate = new Date(params.endDate as string);

    const surveys = await this.prisma.npsSurvey.findMany({
      where: {
        tenantId,
        respondedAt: { gte: startDate, lte: endDate },
        score: { not: null },
      },
      select: { score: true },
    });

    const reviews = await this.prisma.reviewRequest.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { status: true },
    });

    const scores = surveys.map((s) => s.score!);
    const promoters = scores.filter((s) => s >= 9).length;
    const passives = scores.filter((s) => s >= 7 && s <= 8).length;
    const detractors = scores.filter((s) => s <= 6).length;
    const totalResponses = scores.length;

    const npsScore =
      totalResponses > 0
        ? Math.round(((promoters - detractors) / totalResponses) * 100)
        : 0;

    return {
      npsScore,
      promoters,
      passives,
      detractors,
      totalResponses,
      reviewsRequested: reviews.length,
      reviewsClicked: reviews.filter((r) => r.status === 'CLICKED').length,
    };
  }

  private async getRetentionMetrics(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: { context: true },
    });

    const totalCustomers = customers.length;
    const atRiskCount = customers.filter((c) => c.churnRisk >= 0.5).length;
    const dormantCount = customers.filter((c) => c.lifecycleStage === 'dormant').length;
    const averageHealthScore =
      totalCustomers > 0
        ? Math.round(
            customers.reduce((sum, c) => sum + c.healthScore, 0) / totalCustomers,
          )
        : 0;

    const totalSpent = customers.reduce(
      (sum, c) => sum + this.toNumber((c as any).context?.totalSpent || 0),
      0,
    );
    const averageCLV = totalCustomers > 0 ? Math.round(totalSpent / totalCustomers) : 0;

    return {
      totalCustomers,
      atRiskCount,
      dormantCount,
      averageHealthScore,
      averageCLV,
      churnRiskRate:
        totalCustomers > 0 ? Math.round((atRiskCount / totalCustomers) * 100) : 0,
    };
  }

  private async getScheduleUtilization(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const startDate = new Date(params.startDate as string);
    const endDate = new Date(params.endDate as string);

    const technicians = await this.prisma.user.findMany({
      where: { tenantId, role: 'TECHNICIAN', status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: startDate, lte: endDate },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'IN_PROGRESS'] },
      },
      select: { assignedTo: true, duration: true },
    });

    const byTechnician = new Map<string, number>();
    for (const appt of appointments) {
      if (!appt.assignedTo) continue;
      const current = byTechnician.get(appt.assignedTo) || 0;
      byTechnician.set(appt.assignedTo, current + appt.duration);
    }

    // Assuming 8 hour workday, 5 days/week
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const workDays = Math.min(days, Math.floor(days * 5 / 7));
    const availableMinutesPerTech = workDays * 8 * 60;

    const techResults = technicians.map((tech) => {
      const scheduledMinutes = byTechnician.get(tech.id) || 0;
      const utilization =
        availableMinutesPerTech > 0
          ? Math.round((scheduledMinutes / availableMinutesPerTech) * 100)
          : 0;
      return { id: tech.id, name: tech.name, scheduledMinutes, utilization };
    });

    const totalScheduled = Array.from(byTechnician.values()).reduce((a, b) => a + b, 0);
    const totalAvailable = technicians.length * availableMinutesPerTech;
    const overallUtilization =
      totalAvailable > 0 ? Math.round((totalScheduled / totalAvailable) * 100) : 0;

    return { overallUtilization, technicians: techResults };
  }

  // ========================================
  // Write Tool Handlers (Create Actions)
  // ========================================

  private async createCampaignAction(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const action = await this.actionExecutor.createAction(tenantId, {
      actionType: 'CREATE_CAMPAIGN',
      title: `Create campaign: ${params.name}`,
      description: `${params.type} campaign targeting ${params.targetSegment || 'all customers'}`,
      params: {
        name: params.name,
        type: params.type,
        content: params.message,
        subject: params.subject,
        targetSegment: params.targetSegment,
        scheduledAt: params.scheduledAt,
      },
      estimatedImpact: params.targetSegment ? `Target: ${params.targetSegment}` : 'All customers',
      riskLevel: 'MEDIUM',
      requiresApproval: true,
    });

    return {
      success: true,
      message: `Campaign action created and pending approval. Action ID: ${action.id}`,
      actionId: action.id,
      status: action.status,
      requiresApproval: true,
    };
  }

  private async sendSmsAction(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    // Get customer phone if we have customerId
    let phone: string | undefined;
    let customerName = params.customerName as string | undefined;

    if (params.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: params.customerId as string, tenantId },
        select: { phone: true, name: true },
      });
      if (customer) {
        phone = customer.phone || undefined;
        customerName = customerName || customer.name;
      }
    }

    const action = await this.actionExecutor.createAction(tenantId, {
      actionType: 'SEND_SMS',
      title: `Send SMS to ${customerName || 'customer'}`,
      description: `Message: "${(params.message as string).slice(0, 50)}${(params.message as string).length > 50 ? '...' : ''}"`,
      params: {
        customerId: params.customerId,
        phone,
        message: params.message,
      },
      estimatedImpact: '1 message',
      riskLevel: 'LOW',
      requiresApproval: true,
    });

    return {
      success: true,
      message: `SMS action created for ${customerName}. Awaiting your confirmation.`,
      actionId: action.id,
      status: action.status,
      requiresApproval: true,
    };
  }

  private async createSegmentAction(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const conditions = params.conditions as Array<{ field: string; operator: string; value: unknown }>;
    const logic = (params.logic as string) || 'AND';

    const action = await this.actionExecutor.createAction(tenantId, {
      actionType: 'CREATE_SEGMENT',
      title: `Create segment: ${params.name}`,
      description: params.description as string || `Segment with ${conditions.length} condition(s)`,
      params: {
        name: params.name,
        description: params.description,
        rules: { conditions, logic },
      },
      estimatedImpact: 'New audience segment',
      riskLevel: 'LOW',
      requiresApproval: false, // Segments don't need approval
    });

    return {
      success: true,
      message: `Segment "${params.name}" is being created.`,
      actionId: action.id,
      status: action.status,
      requiresApproval: false,
    };
  }

  private async scheduleFollowUpAction(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    let title = `Schedule ${params.method} follow-up`;
    let description = '';

    if (params.quoteId) {
      const quote = await this.prisma.quote.findFirst({
        where: { id: params.quoteId as string, tenantId },
        include: { customer: { select: { name: true } } },
      });
      if (quote) {
        title = `Follow up on quote for ${quote.customer?.name || 'customer'}`;
        description = `Quote #${quote.quoteNumber} - ${params.method} follow-up`;
      }
    }

    const action = await this.actionExecutor.createAction(tenantId, {
      actionType: 'SCHEDULE_FOLLOW_UP',
      title,
      description: description || params.notes as string || 'Follow-up scheduled',
      params: {
        quoteId: params.quoteId,
        customerId: params.customerId,
        method: params.method,
        scheduledFor: params.scheduledFor,
        notes: params.notes,
      },
      estimatedImpact: 'Improve conversion',
      riskLevel: 'LOW',
      requiresApproval: false,
    });

    return {
      success: true,
      message: `Follow-up scheduled via ${params.method}.`,
      actionId: action.id,
      status: action.status,
      requiresApproval: false,
    };
  }

  private async applyDiscountAction(
    params: Record<string, unknown>,
    tenantId: string,
  ) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: params.quoteId as string, tenantId },
      include: { customer: { select: { name: true } } },
    });

    const discountPercent = params.discountPercent as number;
    const title = quote
      ? `Apply ${discountPercent}% discount to quote for ${quote.customer?.name}`
      : `Apply ${discountPercent}% discount`;

    const action = await this.actionExecutor.createAction(tenantId, {
      actionType: 'APPLY_DISCOUNT',
      title,
      description: params.reason as string || `${discountPercent}% discount`,
      params: {
        quoteId: params.quoteId,
        discountPercent,
        reason: params.reason,
      },
      estimatedImpact: `${discountPercent}% off quote value`,
      riskLevel: 'MEDIUM',
      requiresApproval: true,
    });

    return {
      success: true,
      message: `Discount action created. Please approve to apply the ${discountPercent}% discount.`,
      actionId: action.id,
      status: action.status,
      requiresApproval: true,
    };
  }

  private groupRevenue(
    invoices: Array<{ paidAt: Date | null; paidAmount: Decimal | null }>,
    groupBy: string,
  ): Record<string, number> {
    const grouped: Record<string, number> = {};

    for (const inv of invoices) {
      if (!inv.paidAt) continue;
      let key: string;

      if (groupBy === 'week') {
        const weekStart = new Date(inv.paidAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = inv.paidAt.toISOString().split('T')[0];
      }

      grouped[key] = (grouped[key] || 0) + this.toNumber(inv.paidAmount);
    }

    return grouped;
  }

  private toNumber(value: Decimal | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }
}
