import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ActionExecutorService } from '../ai-actions/action-executor.service';
import {
  AgentType,
  InsightPriority,
  InsightStatus,
  AgentInsight,
} from '@prisma/client';

export interface InsightFilters {
  agentType?: AgentType;
  priority?: InsightPriority;
  status?: InsightStatus;
  entityType?: string;
  limit?: number;
  offset?: number;
}

export interface InsightSummary {
  total: number;
  byPriority: Record<InsightPriority, number>;
  byAgent: Record<AgentType, number>;
  byStatus: Record<InsightStatus, number>;
  pendingUrgent: number;
  pendingHigh: number;
}

@Injectable()
export class AgentInsightsService {
  private readonly logger = new Logger(AgentInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ActionExecutorService))
    private readonly actionExecutor: ActionExecutorService,
  ) {}

  async listInsights(
    tenantId: string,
    filters: InsightFilters,
  ): Promise<{ insights: AgentInsight[]; total: number }> {
    const where = {
      tenantId,
      ...(filters.agentType && { agentType: filters.agentType }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.status && { status: filters.status }),
      ...(filters.entityType && { entityType: filters.entityType }),
    };

    const [insights, total] = await Promise.all([
      this.prisma.agentInsight.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      this.prisma.agentInsight.count({ where }),
    ]);

    return { insights, total };
  }

  async getInsight(
    tenantId: string,
    insightId: string,
  ): Promise<AgentInsight> {
    const insight = await this.prisma.agentInsight.findFirst({
      where: { id: insightId, tenantId },
    });

    if (!insight) {
      throw new NotFoundException(`Insight ${insightId} not found`);
    }

    return insight;
  }

  async updateInsightStatus(
    tenantId: string,
    insightId: string,
    status: InsightStatus,
    userId: string,
    rejectionReason?: string,
  ): Promise<AgentInsight> {
    const insight = await this.getInsight(tenantId, insightId);

    const updateData: Record<string, unknown> = { status };

    if (status === InsightStatus.APPROVED) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = userId;
    } else if (status === InsightStatus.REJECTED) {
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = userId;
      updateData.rejectionReason = rejectionReason;
    }

    const updated = await this.prisma.agentInsight.update({
      where: { id: insight.id },
      data: updateData,
    });

    // When insight is approved, create and execute the associated action
    if (status === InsightStatus.APPROVED && insight.actionParams) {
      try {
        await this.actionExecutor.createFromInsight(tenantId, insightId, userId);
        this.logger.log(`Created action from approved insight ${insightId}`);
      } catch (error) {
        this.logger.error(`Failed to create action from insight ${insightId}: ${error}`);
        // Don't throw - the insight is still approved even if action creation fails
      }
    }

    return updated;
  }

  async getSummary(tenantId: string): Promise<InsightSummary> {
    const pending = await this.prisma.agentInsight.findMany({
      where: { tenantId, status: InsightStatus.PENDING },
      select: { priority: true, agentType: true },
    });

    const all = await this.prisma.agentInsight.findMany({
      where: { tenantId },
      select: { priority: true, agentType: true, status: true },
    });

    const byPriority = {
      [InsightPriority.URGENT]: 0,
      [InsightPriority.HIGH]: 0,
      [InsightPriority.MEDIUM]: 0,
      [InsightPriority.LOW]: 0,
    };

    const byAgent = {
      [AgentType.REVENUE_SALES]: 0,
      [AgentType.CUSTOMER_SUCCESS]: 0,
      [AgentType.OPERATIONS]: 0,
      [AgentType.MARKETING]: 0,
    };

    const byStatus = {
      [InsightStatus.PENDING]: 0,
      [InsightStatus.APPROVED]: 0,
      [InsightStatus.REJECTED]: 0,
      [InsightStatus.EXPIRED]: 0,
    };

    for (const insight of all) {
      byPriority[insight.priority]++;
      byAgent[insight.agentType]++;
      byStatus[insight.status]++;
    }

    const pendingUrgent = pending.filter(
      (i) => i.priority === InsightPriority.URGENT,
    ).length;
    const pendingHigh = pending.filter(
      (i) => i.priority === InsightPriority.HIGH,
    ).length;

    return {
      total: all.length,
      byPriority,
      byAgent,
      byStatus,
      pendingUrgent,
      pendingHigh,
    };
  }

  async expireOldInsights(): Promise<number> {
    const result = await this.prisma.agentInsight.updateMany({
      where: {
        status: InsightStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InsightStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} old insights`);
    }

    return result.count;
  }

  async deleteInsight(tenantId: string, insightId: string): Promise<void> {
    const insight = await this.getInsight(tenantId, insightId);
    await this.prisma.agentInsight.delete({ where: { id: insight.id } });
  }
}
