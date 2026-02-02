import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, TaskLedgerEventPayload } from '../../config/events/events.types';
import { Prisma } from '@prisma/client';
import {
  TASK_LEDGER_QUEUE,
  TaskLedgerJob,
  CreateTaskOptions,
  TaskStats,
  TaskLedgerType,
  TaskLedgerCategory,
  TaskLedgerStatus,
} from './types';

@Injectable()
export class TaskLedgerService {
  private readonly logger = new Logger(TaskLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    @InjectQueue(TASK_LEDGER_QUEUE) private readonly queue: Queue,
  ) {}

  /**
   * Create a new task in the ledger
   */
  async createTask(opts: CreateTaskOptions) {
    const idempotencyKey =
      opts.idempotencyKey || this.generateIdempotencyKey(opts);
    const traceId = opts.traceId || randomUUID();

    // Check for duplicate using idempotency key
    const existing = await this.prisma.taskLedgerEntry.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      this.logger.debug(`Task already exists: ${idempotencyKey}`);
      return existing;
    }

    const task = await this.prisma.taskLedgerEntry.create({
      data: {
        tenantId: opts.tenantId,
        type: opts.type,
        category: opts.category,
        status: this.resolveInitialStatus(opts.scheduledFor),
        priority: opts.priority ?? 50,
        title: opts.title,
        description: opts.description,
        icon: opts.icon,
        entityType: opts.entityType,
        entityId: opts.entityId,
        actionType: opts.actionType,
        actionEndpoint: opts.actionEndpoint,
        payload: opts.payload as Prisma.InputJsonValue | undefined,
        scheduledFor: opts.scheduledFor,
        undoWindowMins: opts.undoWindowMins,
        undoEndpoint: opts.undoEndpoint,
        undoPayload: opts.undoPayload as Prisma.InputJsonValue | undefined,
        aiConfidence: opts.aiConfidence,
        aiReasoning: opts.aiReasoning,
        aiModel: opts.aiModel,
        idempotencyKey,
        traceId,
      },
    });

    // Queue for execution if scheduled
    if (opts.scheduledFor) {
      const delay = Math.max(0, opts.scheduledFor.getTime() - Date.now());
      await this.queue.add(
        'execute',
        { taskId: task.id, tenantId: opts.tenantId } as TaskLedgerJob,
        { delay, jobId: task.id },
      );
      this.logger.log(`Scheduled task ${task.id} for ${opts.scheduledFor}`);
    }

    this.events.emit<TaskLedgerEventPayload>(EVENTS.TASK_LEDGER_CREATED, {
      tenantId: opts.tenantId,
      taskId: task.id,
      type: task.type,
      category: task.category,
    });

    return task;
  }

  /**
   * Get pending tasks for Command Center
   */
  async getPendingTasks(
    tenantId: string,
    options?: {
      types?: TaskLedgerType[];
      categories?: TaskLedgerCategory[];
      limit?: number;
      priorityMin?: number;
    },
  ) {
    return this.prisma.taskLedgerEntry.findMany({
      where: {
        tenantId,
        status: 'PENDING',
        type: options?.types?.length ? { in: options.types } : undefined,
        category: options?.categories?.length ? { in: options.categories } : undefined,
        priority: options?.priorityMin ? { gte: options.priorityMin } : undefined,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: options?.limit ?? 20,
    });
  }

  /**
   * Get approvals awaiting owner decision
   */
  async getPendingApprovals(tenantId: string, limit = 10) {
    return this.prisma.taskLedgerEntry.findMany({
      where: {
        tenantId,
        type: 'APPROVAL',
        status: 'PENDING',
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });
  }

  /**
   * Get today's tasks (scheduled for today)
   */
  async getTodaysTasks(tenantId: string, limit = 20) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.taskLedgerEntry.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
        OR: [
          { scheduledFor: { gte: startOfDay, lte: endOfDay } },
          { scheduledFor: null, createdAt: { gte: startOfDay } },
        ],
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { priority: 'desc' },
        { scheduledFor: 'asc' },
      ],
      take: limit,
    });
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string, tenantId: string) {
    const task = await this.prisma.taskLedgerEntry.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return task;
  }

  /**
   * Approve and queue a task for execution
   */
  async approveTask(taskId: string, tenantId: string, userId: string) {
    const task = await this.getTask(taskId, tenantId);

    if (task.status !== 'PENDING' && task.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `Task ${taskId} is not available for approval (status: ${task.status})`,
      );
    }

    try {
      // Queue for immediate execution with high priority
      await this.queue.add(
        'execute',
        { taskId, tenantId, approvedBy: userId } as TaskLedgerJob,
        { priority: 1, jobId: `approved-${taskId}` },
      );

      // Remove scheduled job if it exists to avoid duplicate execution
      if (task.status === 'SCHEDULED') {
        const scheduledJob = await this.queue.getJob(taskId);
        if (scheduledJob) {
          await scheduledJob.remove();
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to queue task ${taskId}: ${errorMsg}`);
      throw new InternalServerErrorException(
        `Failed to queue task ${taskId} for execution`,
      );
    }

    // Update status to in progress
    const updated = await this.prisma.taskLedgerEntry.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        scheduledFor: task.status === 'SCHEDULED' ? null : undefined,
      },
    });

    this.logger.log(`Task ${taskId} approved by ${userId}`);

    this.events.emit<TaskLedgerEventPayload>(EVENTS.TASK_LEDGER_APPROVED, {
      tenantId,
      taskId,
      approvedBy: userId,
    });

    return updated;
  }

  /**
   * Decline/cancel a task
   */
  async declineTask(
    taskId: string,
    tenantId: string,
    userId: string,
    reason?: string,
  ) {
    const task = await this.getTask(taskId, tenantId);

    if (task.status !== 'PENDING' && task.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `Task ${taskId} cannot be declined (status: ${task.status})`,
      );
    }

    // Remove from queue if scheduled
    try {
      const job = await this.queue.getJob(taskId);
      if (job) await job.remove();
    } catch (e) {
      // Job may not exist in queue
    }

    const updated = await this.prisma.taskLedgerEntry.update({
      where: { id: taskId },
      data: {
        status: 'CANCELLED',
        executedBy: userId,
        executedAt: new Date(),
        failureReason: reason || 'Declined by user',
      },
    });

    this.logger.log(`Task ${taskId} declined by ${userId}: ${reason}`);

    this.events.emit<TaskLedgerEventPayload>(EVENTS.TASK_LEDGER_DECLINED, {
      tenantId,
      taskId,
      declinedBy: userId,
      reason,
    });

    return updated;
  }

  /**
   * Complete a task manually (for human tasks)
   */
  async completeTask(taskId: string, tenantId: string, userId: string) {
    const task = await this.getTask(taskId, tenantId);

    if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Task ${taskId} cannot be completed (status: ${task.status})`,
      );
    }

    const updated = await this.prisma.taskLedgerEntry.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        executedAt: new Date(),
        executedBy: userId,
      },
    });

    this.logger.log(`Task ${taskId} completed by ${userId}`);

    this.events.emit<TaskLedgerEventPayload>(EVENTS.TASK_LEDGER_COMPLETED, {
      tenantId,
      taskId,
    });

    return updated;
  }

  /**
   * Undo a completed task (within undo window)
   */
  async undoTask(taskId: string, tenantId: string, userId: string) {
    const task = await this.getTask(taskId, tenantId);

    if (task.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Task ${taskId} cannot be undone (status: ${task.status})`,
      );
    }

    // Check undo window
    if (task.undoWindowMins && task.executedAt) {
      const undoDeadline = new Date(
        task.executedAt.getTime() + task.undoWindowMins * 60 * 1000,
      );
      if (new Date() > undoDeadline) {
        throw new BadRequestException(
          `Undo window for task ${taskId} has expired`,
        );
      }
    } else {
      throw new BadRequestException(`Task ${taskId} does not support undo`);
    }

    // Execute undo action if configured
    if (task.undoEndpoint) {
      await this.executeUndoAction(task);
    }

    const updated = await this.prisma.taskLedgerEntry.update({
      where: { id: taskId },
      data: {
        status: 'UNDONE',
        undoneAt: new Date(),
        undoneBy: userId,
      },
    });

    this.logger.log(`Task ${taskId} undone by ${userId}`);

    this.events.emit<TaskLedgerEventPayload>(EVENTS.TASK_LEDGER_UNDONE, {
      tenantId,
      taskId,
    });

    return updated;
  }

  /**
   * Mark task as failed (called by processor)
   */
  async markFailed(
    taskId: string,
    error: string,
    shouldRetry: boolean,
  ) {
    const task = await this.prisma.taskLedgerEntry.findUnique({
      where: { id: taskId },
    });

    if (!task) return null;

    if (this.canRetryTask(task, shouldRetry)) {
      return this.scheduleRetry(task, error);
    }

    // Mark as permanently failed
    return this.prisma.taskLedgerEntry.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        failureReason: error,
        executedAt: new Date(),
      },
    });
  }

  /**
   * Mark task as completed (called by processor)
   */
  async markCompleted(
    taskId: string,
    executedBy: string,
    result?: Record<string, unknown>,
  ) {
    return this.prisma.taskLedgerEntry.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        executedAt: new Date(),
        executedBy,
        result: result as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Get task statistics for dashboard
   */
  async getTaskStats(tenantId: string): Promise<TaskStats> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [pending, approvals, completedToday, failedToday] = await Promise.all(
      [
        this.prisma.taskLedgerEntry.count({
          where: {
            tenantId,
            status: 'PENDING',
            type: { not: 'APPROVAL' },
          },
        }),
        this.prisma.taskLedgerEntry.count({
          where: {
            tenantId,
            status: 'PENDING',
            type: 'APPROVAL',
          },
        }),
        this.prisma.taskLedgerEntry.count({
          where: {
            tenantId,
            status: 'COMPLETED',
            executedAt: { gte: startOfDay },
          },
        }),
        this.prisma.taskLedgerEntry.count({
          where: {
            tenantId,
            status: 'FAILED',
            updatedAt: { gte: startOfDay },
          },
        }),
      ],
    );

    return { pending, approvals, completedToday, failedToday };
  }

  /**
   * Get recent activity for a specific entity
   */
  async getEntityTasks(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit = 10,
  ) {
    return this.prisma.taskLedgerEntry.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Cancel all pending tasks for an entity
   * (e.g., when a quote is accepted, cancel all follow-up tasks)
   */
  async cancelEntityTasks(
    tenantId: string,
    entityType: string,
    entityId: string,
    reason: string,
  ) {
    const result = await this.prisma.taskLedgerEntry.updateMany({
      where: {
        tenantId,
        entityType,
        entityId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      data: {
        status: 'CANCELLED',
        failureReason: reason,
        executedAt: new Date(),
        executedBy: 'SYSTEM',
      },
    });

    this.logger.log(
      `Cancelled ${result.count} tasks for ${entityType}:${entityId}`,
    );

    return result.count;
  }

  /**
   * Generate idempotency key from task options
   */
  private generateIdempotencyKey(opts: CreateTaskOptions): string {
    if (
      !opts.actionType &&
      !opts.actionEndpoint &&
      opts.type === TaskLedgerType.HUMAN_TASK
    ) {
      return this.randomIdempotencyKey();
    }

    const payloadHash = this.hashPayload(opts.payload);
    const parts = [
      opts.tenantId,
      opts.type,
      opts.category,
      opts.actionType,
      opts.actionEndpoint,
      opts.entityType,
      opts.entityId,
      opts.scheduledFor?.toISOString(),
      payloadHash,
    ];
    return createHash('sha256')
      .update(parts.filter(Boolean).join(':'))
      .digest('hex')
      .slice(0, 32);
  }

  private resolveInitialStatus(scheduledFor?: Date): TaskLedgerStatus {
    if (scheduledFor && scheduledFor.getTime() > Date.now()) {
      return TaskLedgerStatus.SCHEDULED;
    }
    return TaskLedgerStatus.PENDING;
  }

  private hashPayload(payload?: Record<string, unknown>): string | undefined {
    if (!payload) return undefined;
    return createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .slice(0, 8);
  }

  private randomIdempotencyKey(): string {
    return createHash('sha256').update(randomUUID()).digest('hex').slice(0, 32);
  }

  private getRetryDelayMs(retryCount: number): number {
    const baseDelay = 30_000; // 30 seconds
    const delay = retryCount * baseDelay;
    return Math.min(delay, 5 * 60_000);
  }

  private canRetryTask(
    task: { retryCount: number; maxRetries: number },
    shouldRetry: boolean,
  ): boolean {
    return shouldRetry && task.retryCount < task.maxRetries;
  }

  private async scheduleRetry(
    task: { id: string; tenantId: string; retryCount: number },
    error: string,
  ) {
    const nextRetryCount = task.retryCount + 1;
    const delayMs = this.getRetryDelayMs(nextRetryCount);
    const scheduledFor = delayMs > 0 ? new Date(Date.now() + delayMs) : null;

    const updated = await this.prisma.taskLedgerEntry.update({
      where: { id: task.id },
      data: {
        status: delayMs > 0 ? 'SCHEDULED' : 'PENDING',
        retryCount: { increment: 1 },
        failureReason: error,
        scheduledFor,
      },
    });

    try {
      await this.queue.add(
        'execute',
        { taskId: task.id, tenantId: task.tenantId } as TaskLedgerJob,
        { delay: delayMs, jobId: `retry-${task.id}-${nextRetryCount}` },
      );
    } catch (queueError) {
      const queueMsg =
        queueError instanceof Error ? queueError.message : String(queueError);
      return this.prisma.taskLedgerEntry.update({
        where: { id: task.id },
        data: {
          status: 'FAILED',
          failureReason: `${error} | Retry enqueue failed: ${queueMsg}`,
          executedAt: new Date(),
        },
      });
    }

    return updated;
  }

  /**
   * Execute undo action via HTTP call
   */
  private async executeUndoAction(task: {
    undoEndpoint: string | null;
    undoPayload: unknown;
    tenantId: string;
  }) {
    if (!task.undoEndpoint) return;

    this.logger.log(`Executing undo action: ${task.undoEndpoint}`);
    // In a real implementation, this would make an HTTP call
    // For now, we emit an event that other modules can handle
    this.events.emit<TaskLedgerEventPayload>(EVENTS.TASK_LEDGER_UNDO_REQUESTED, {
      tenantId: task.tenantId,
      endpoint: task.undoEndpoint,
      payload: task.undoPayload,
    });
  }
}
