import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CALENDAR_QUEUE, CalendarJobData } from './calendar.processor';

// Rate limit: max jobs per tenant per minute
const TENANT_RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60000;

@Injectable()
export class CalendarQueueService {
  private readonly logger = new Logger(CalendarQueueService.name);
  private tenantJobCounts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    @InjectQueue(CALENDAR_QUEUE) private readonly calendarQueue: Queue,
  ) {}

  private checkRateLimit(tenantId: string): { allowed: boolean; delay: number } {
    const now = Date.now();
    const tenantLimit = this.tenantJobCounts.get(tenantId);

    if (!tenantLimit || now >= tenantLimit.resetAt) {
      this.tenantJobCounts.set(tenantId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      });
      return { allowed: true, delay: 0 };
    }

    if (tenantLimit.count >= TENANT_RATE_LIMIT) {
      const delay = tenantLimit.resetAt - now;
      return { allowed: false, delay };
    }

    tenantLimit.count++;
    return { allowed: true, delay: 0 };
  }

  /**
   * Queue an appointment to be synced to Google Calendar
   */
  async queueSync(appointmentId: string, tenantId: string): Promise<string> {
    const rateLimit = this.checkRateLimit(tenantId);
    const baseDelay = 1000; // Ensure DB transaction is committed

    const job = await this.calendarQueue.add(
      'sync-appointment',
      { type: 'sync', appointmentId, tenantId } as CalendarJobData,
      {
        jobId: `sync-${appointmentId}-${Date.now()}`,
        delay: rateLimit.allowed ? baseDelay : baseDelay + rateLimit.delay,
        priority: rateLimit.allowed ? 1 : 2, // Lower priority if rate limited
      },
    );

    if (!rateLimit.allowed) {
      this.logger.warn(
        `Tenant ${tenantId} rate limited, job delayed by ${rateLimit.delay}ms`,
      );
    }

    this.logger.log(`Queued sync for appointment ${appointmentId}`);
    return job.id!;
  }

  /**
   * Queue a calendar event deletion
   */
  async queueDelete(appointmentId: string, tenantId: string): Promise<string> {
    const rateLimit = this.checkRateLimit(tenantId);

    const job = await this.calendarQueue.add(
      'delete-event',
      { type: 'delete', appointmentId, tenantId } as CalendarJobData,
      {
        jobId: `delete-${appointmentId}-${Date.now()}`,
        delay: rateLimit.allowed ? 0 : rateLimit.delay,
        priority: rateLimit.allowed ? 1 : 2,
      },
    );

    this.logger.log(`Queued delete for appointment ${appointmentId}`);
    return job.id!;
  }

  /**
   * Queue multiple appointments for bulk sync
   */
  async queueBulkSync(
    appointmentIds: string[],
    tenantId: string,
  ): Promise<string> {
    const job = await this.calendarQueue.add(
      'bulk-sync',
      { type: 'bulk-sync', appointmentIds, tenantId } as CalendarJobData,
      {
        jobId: `bulk-${tenantId}-${Date.now()}`,
      },
    );
    this.logger.log(
      `Queued bulk sync for ${appointmentIds.length} appointments`,
    );
    return job.id!;
  }

  /**
   * Get queue stats for monitoring
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.calendarQueue.getWaitingCount(),
      this.calendarQueue.getActiveCount(),
      this.calendarQueue.getCompletedCount(),
      this.calendarQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Retry all failed jobs
   */
  async retryFailedJobs(): Promise<number> {
    const failed = await this.calendarQueue.getFailed();
    let retried = 0;

    for (const job of failed) {
      await job.retry();
      retried++;
    }

    return retried;
  }
}
