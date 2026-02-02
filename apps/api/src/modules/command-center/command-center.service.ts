import { Injectable } from '@nestjs/common';
import type { TaskLedgerEntry } from '@prisma/client';
import { DashboardCacheService } from './dashboard-cache.service';
import { CommandCenterDashboard, ApprovalItem, TaskItem } from './types';
import { TaskLedgerService } from '../task-ledger/task-ledger.service';
import { TaskLedgerType } from '../task-ledger/types';
import { buildOneTapWin, buildQuickActions } from './command-center.actions';

const DEFAULT_APPROVAL_LIMIT = 3;
const DEFAULT_TASK_LIMIT = 5;
const MAX_LIMIT = 50;

export interface CommandCenterDashboardOptions {
  approvalsLimit?: number;
  tasksLimit?: number;
}

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly dashboardCache: DashboardCacheService,
    private readonly taskLedger: TaskLedgerService,
  ) {}

  async getDashboard(
    tenantId: string,
    options?: CommandCenterDashboardOptions,
  ): Promise<CommandCenterDashboard> {
    const approvalsLimit = this.resolveLimit(
      options?.approvalsLimit,
      DEFAULT_APPROVAL_LIMIT,
    );
    const tasksLimit = this.resolveLimit(
      options?.tasksLimit,
      DEFAULT_TASK_LIMIT,
    );

    const [cache, approvals, tasks] = await Promise.all([
      this.dashboardCache.getDashboardData(tenantId),
      this.taskLedger.getPendingApprovals(tenantId, approvalsLimit),
      this.taskLedger.getPendingTasks(tenantId, {
        types: [
          TaskLedgerType.AI_ACTION,
          TaskLedgerType.SYSTEM_TASK,
          TaskLedgerType.HUMAN_TASK,
        ],
        limit: tasksLimit,
      }),
    ]);

    return {
      statusBar: cache.statusBar,
      taskStats: cache.taskStats,
      metrics: cache.metrics,
      approvals: approvals.map((entry) => this.toApprovalItem(entry)),
      tasks: tasks.map((entry) => this.toTaskItem(entry)),
      signals: cache.signals,
      oneTapWin: buildOneTapWin(cache),
      quickActions: buildQuickActions(cache),
      cachedAt: cache.cachedAt,
    };
  }

  async refreshDashboard(
    tenantId: string,
    options?: CommandCenterDashboardOptions,
  ): Promise<CommandCenterDashboard> {
    await this.dashboardCache.refreshDashboardData(tenantId);
    return this.getDashboard(tenantId, options);
  }

  private resolveLimit(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value) || !value || value <= 0) {
      return fallback;
    }
    return Math.min(value, MAX_LIMIT);
  }

  private toApprovalItem(entry: TaskLedgerEntry): ApprovalItem {
    return {
      id: entry.id,
      title: entry.title,
      description: entry.description ?? undefined,
      icon: entry.icon ?? undefined,
      entityType: entry.entityType ?? undefined,
      entityId: entry.entityId ?? undefined,
      aiConfidence: entry.aiConfidence ?? undefined,
      aiReasoning: entry.aiReasoning ?? undefined,
      category: entry.category,
      priority: entry.priority,
      createdAt: entry.createdAt,
    };
  }

  private toTaskItem(entry: TaskLedgerEntry): TaskItem {
    return {
      id: entry.id,
      title: entry.title,
      description: entry.description ?? undefined,
      icon: entry.icon ?? undefined,
      status: entry.status,
      category: entry.category,
      priority: entry.priority,
      entityType: entry.entityType ?? undefined,
      entityId: entry.entityId ?? undefined,
      scheduledFor: entry.scheduledFor ?? undefined,
      createdAt: entry.createdAt,
    };
  }
}
