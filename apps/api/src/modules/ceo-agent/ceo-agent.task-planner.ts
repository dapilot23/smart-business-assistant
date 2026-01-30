import { AgentType, TaskOwnerType, TaskSourceType, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AgentTasksService } from '../agent-tasks/agent-tasks.service';
import { CeoMetrics, TaskCandidate } from './ceo-agent.types';
import {
  buildPendingActionsTask,
  buildPendingQuotesTask,
  buildOverdueInvoicesTask,
  buildUnconfirmedAppointmentsTask,
  buildUnassignedAppointmentsTask,
  buildReviewRequestsTask,
  buildHiringRecommendationTask,
} from './ceo-agent.task-builders';

export function buildTaskCandidates(
  metrics: CeoMetrics,
  ownerUserId?: string,
): TaskCandidate[] {
  const tasks: Array<TaskCandidate | null> = [
    buildPendingActionsTask(metrics.pendingActions, ownerUserId),
    buildPendingQuotesTask(metrics.pendingQuotes),
    buildOverdueInvoicesTask(metrics.overdueInvoices),
    buildUnconfirmedAppointmentsTask(metrics.unconfirmedAppointments),
    buildUnassignedAppointmentsTask(metrics.unassignedAppointments),
    buildReviewRequestsTask(metrics.pendingReviewRequests),
    buildHiringRecommendationTask(metrics, ownerUserId),
  ];

  return tasks.filter((task): task is TaskCandidate => Boolean(task));
}

export async function createTasks(
  prisma: PrismaService,
  tasksService: AgentTasksService,
  tenantId: string,
  candidates: TaskCandidate[],
  fallbackUserId?: string,
) {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const candidate of candidates) {
    const exists = await hasOpenTask(prisma, tenantId, candidate.sourceType, candidate.sourceId);
    if (exists) {
      skipped.push(candidate.sourceId);
      continue;
    }

    await tasksService.createTask(
      tenantId,
      {
        title: candidate.title,
        description: candidate.description,
        ownerType: candidate.ownerType,
        ownerAgentType: candidate.ownerAgentType,
        ownerUserId: candidate.ownerUserId,
        priority: candidate.priority,
        status: TaskStatus.PENDING,
        dueAt: candidate.dueAt ? candidate.dueAt.toISOString() : undefined,
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        metadata: candidate.metadata,
        createdByType: TaskOwnerType.AI_AGENT,
        createdByAgentType: AgentType.FOUNDER,
      },
      fallbackUserId ?? candidate.ownerUserId ?? '',
    );

    created.push(candidate.sourceId);
  }

  return { created, skipped };
}

async function hasOpenTask(
  prisma: PrismaService,
  tenantId: string,
  sourceType: TaskSourceType,
  sourceId: string,
): Promise<boolean> {
  const existing = await prisma.agentTask.findFirst({
    where: {
      tenantId,
      sourceType,
      sourceId,
      status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED] },
    },
    select: { id: true },
  });
  return Boolean(existing);
}
