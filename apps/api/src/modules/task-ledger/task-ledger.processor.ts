import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, EventType, TaskLedgerEventPayload, TaskActionEventPayload } from '../../config/events/events.types';
import { TaskLedgerService } from './task-ledger.service';
import {
  TASK_LEDGER_QUEUE,
  TaskLedgerJob,
  ExecuteTaskResult,
  TaskActionType,
} from './types';

@Processor(TASK_LEDGER_QUEUE)
export class TaskLedgerProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskLedgerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly taskLedgerService: TaskLedgerService,
  ) {
    super();
  }

  async process(job: Job<TaskLedgerJob>): Promise<ExecuteTaskResult> {
    const { taskId, tenantId, approvedBy } = job.data;

    this.logger.log(`Processing task ${taskId} for tenant ${tenantId}`);

    try {
      const task = await this.prisma.taskLedgerEntry.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        this.logger.warn(`Task ${taskId} not found`);
        return { success: false, error: 'Task not found' };
      }

      if (task.tenantId !== tenantId) {
        this.logger.warn(
          `Task ${taskId} tenant mismatch: expected ${tenantId}, got ${task.tenantId}`,
        );
        return { success: false, error: 'Tenant mismatch' };
      }

      // Skip if already processed
      if (['COMPLETED', 'CANCELLED', 'UNDONE'].includes(task.status)) {
        this.logger.log(`Task ${taskId} already processed (${task.status})`);
        return { success: true };
      }

      // Mark as in progress
      await this.prisma.taskLedgerEntry.update({
        where: { id: taskId },
        data: { status: 'IN_PROGRESS' },
      });

      // Execute the task based on action type
      const result = await this.executeAction(task, tenantId);

      if (result.success) {
        await this.taskLedgerService.markCompleted(
          taskId,
          approvedBy || 'SYSTEM',
          result.result,
        );

        this.events.emit<TaskLedgerEventPayload>(EVENTS.TASK_LEDGER_EXECUTED, {
          tenantId,
          taskId,
          actionType: task.actionType,
          success: true,
        });
      } else {
        await this.taskLedgerService.markFailed(
          taskId,
          result.error || 'Unknown error',
          true, // Allow retry
        );

        this.events.emit<TaskLedgerEventPayload>(EVENTS.TASK_LEDGER_EXECUTED, {
          tenantId,
          taskId,
          actionType: task.actionType,
          success: false,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Task ${taskId} failed: ${errorMsg}`);

      await this.taskLedgerService.markFailed(taskId, errorMsg, true);

      return { success: false, error: errorMsg };
    }
  }

  /**
   * Execute the actual task action
   * This is a dispatcher that routes to the appropriate handler
   */
  private async executeAction(
    task: {
      id: string;
      tenantId: string;
      actionType: string | null;
      actionEndpoint: string | null;
      payload: unknown;
      entityType: string | null;
      entityId: string | null;
    },
    tenantId: string,
  ): Promise<ExecuteTaskResult> {
    const { actionType, payload } = task;

    if (!actionType) {
      // No action type means this is a human task - just mark as processed
      return { success: true, result: { message: 'Human task acknowledged' } };
    }

    // Route to appropriate handler based on action type
    // These emit events that other modules can listen to
    switch (actionType) {
      // Billing actions
      case TaskActionType.SEND_PAYMENT_REMINDER:
        return this.emitActionEvent(EVENTS.PAYMENT_REMINDER_REQUESTED, {
          tenantId,
          invoiceId: task.entityId,
          ...(payload as object),
        });

      case TaskActionType.APPLY_LATE_FEE:
        return this.emitActionEvent(EVENTS.LATE_FEE_REQUESTED, {
          tenantId,
          invoiceId: task.entityId,
          ...(payload as object),
        });

      case TaskActionType.SEND_QUOTE_FOLLOWUP:
        return this.emitActionEvent(EVENTS.QUOTE_FOLLOWUP_REQUESTED, {
          tenantId,
          quoteId: task.entityId,
          ...(payload as object),
        });

      // Scheduling actions
      case TaskActionType.SEND_APPOINTMENT_CONFIRMATION:
        return this.emitActionEvent(EVENTS.APPOINTMENT_CONFIRMATION_REQUESTED, {
          tenantId,
          appointmentId: task.entityId,
          ...(payload as object),
        });

      case TaskActionType.SEND_APPOINTMENT_REMINDER:
        return this.emitActionEvent(EVENTS.APPOINTMENT_REMINDER_REQUESTED, {
          tenantId,
          appointmentId: task.entityId,
          ...(payload as object),
        });

      case TaskActionType.MARK_NO_SHOW:
        return this.emitActionEvent(EVENTS.NO_SHOW_REQUESTED, {
          tenantId,
          appointmentId: task.entityId,
          ...(payload as object),
        });

      // Messaging actions
      case TaskActionType.SEND_SMS:
        return this.emitActionEvent(EVENTS.SMS_REQUESTED, {
          tenantId,
          ...(payload as object),
        });

      case TaskActionType.SEND_EMAIL:
        return this.emitActionEvent(EVENTS.EMAIL_REQUESTED, {
          tenantId,
          ...(payload as object),
        });

      case TaskActionType.SEND_AI_RESPONSE:
        return this.emitActionEvent(EVENTS.AI_RESPONSE_REQUESTED, {
          tenantId,
          customerId: task.entityId,
          ...(payload as object),
        });

      // Marketing actions
      case TaskActionType.SEND_REVIEW_REQUEST:
        return this.emitActionEvent(EVENTS.REVIEW_REQUEST_REQUESTED, {
          tenantId,
          customerId: task.entityId,
          jobId: (payload as { jobId?: string })?.jobId,
          ...(payload as object),
        });

      case TaskActionType.SEND_WINBACK:
        return this.emitActionEvent(EVENTS.WINBACK_REQUESTED, {
          tenantId,
          customerId: task.entityId,
          ...(payload as object),
        });

      case TaskActionType.SEND_CAMPAIGN:
        return this.emitActionEvent(EVENTS.CAMPAIGN_SEND_REQUESTED, {
          tenantId,
          campaignId: task.entityId,
          ...(payload as object),
        });

      // Operations actions
      case TaskActionType.ASSIGN_TECHNICIAN:
        return this.emitActionEvent(EVENTS.TECHNICIAN_ASSIGNMENT_REQUESTED, {
          tenantId,
          jobId: task.entityId,
          ...(payload as object),
        });

      case TaskActionType.UPDATE_JOB_STATUS:
        return this.emitActionEvent(EVENTS.JOB_STATUS_UPDATE_REQUESTED, {
          tenantId,
          jobId: task.entityId,
          ...(payload as object),
        });

      default:
        // For custom action types, emit a generic event
        return this.emitActionEvent(EVENTS.TASK_ACTION_REQUESTED, {
          tenantId,
          actionType,
          entityType: task.entityType,
          entityId: task.entityId,
          payload,
        });
    }
  }

  /**
   * Emit an action event and return success
   * Other modules listen for these events and perform the actual work
   */
  private emitActionEvent(
    eventName: EventType,
    payload: Omit<TaskActionEventPayload, 'timestamp' | 'correlationId'>,
  ): ExecuteTaskResult {
    this.events.emit<TaskActionEventPayload>(eventName, payload);
    this.logger.log(`Emitted ${eventName} event`);
    return {
      success: true,
      result: { event: eventName, emittedAt: new Date().toISOString() },
    };
  }
}
