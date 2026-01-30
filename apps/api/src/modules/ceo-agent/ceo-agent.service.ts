import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AgentTasksService } from '../agent-tasks/agent-tasks.service';
import { collectMetrics, findFallbackUserId, findOwnerUserId } from './ceo-agent.metrics';
import { buildTaskCandidates, createTasks } from './ceo-agent.task-planner';

@Injectable()
export class CeoAgentService {
  private readonly logger = new Logger(CeoAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: AgentTasksService,
  ) {}

  async run(
    tenantId: string,
    triggeredBy: 'manual' | 'schedule' | 'event',
    triggerEvent?: string,
  ) {
    const metrics = await collectMetrics(this.prisma, tenantId);
    const ownerUserId = await findOwnerUserId(this.prisma, tenantId);
    const fallbackUserId = ownerUserId ?? await findFallbackUserId(this.prisma, tenantId);
    const candidates = buildTaskCandidates(metrics, ownerUserId);
    const { created, skipped } = await createTasks(
      this.prisma,
      this.tasksService,
      tenantId,
      candidates,
      fallbackUserId,
    );

    this.logger.log(
      `CEO agent run (${triggeredBy}) for tenant ${tenantId}: ` +
        `${created.length} created, ${skipped.length} skipped`,
    );

    return {
      triggeredBy,
      triggerEvent,
      metrics,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
    };
  }
}
