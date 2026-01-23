import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CalendarService } from './calendar.service';

export const CALENDAR_QUEUE = 'calendar';

export type CalendarJobData =
  | { type: 'sync'; appointmentId: string; tenantId: string }
  | { type: 'delete'; appointmentId: string; tenantId: string }
  | { type: 'bulk-sync'; appointmentIds: string[]; tenantId: string };

@Processor(CALENDAR_QUEUE, {
  concurrency: 5, // Process 5 jobs at a time
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // Per second (rate limit per tenant handled separately)
  },
})
export class CalendarProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarProcessor.name);

  constructor(private readonly calendarService: CalendarService) {
    super();
  }

  async process(job: Job<CalendarJobData>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.data.type}`);

    switch (job.data.type) {
      case 'sync':
        return this.handleSync(job.data);
      case 'delete':
        return this.handleDelete(job.data);
      case 'bulk-sync':
        return this.handleBulkSync(job.data);
      default:
        throw new Error(`Unknown job type: ${(job.data as any).type}`);
    }
  }

  private async handleSync(data: { appointmentId: string; tenantId: string }) {
    const eventId = await this.calendarService.syncAppointmentToCalendar(
      data.appointmentId,
    );
    return { success: !!eventId, eventId };
  }

  private async handleDelete(data: { appointmentId: string; tenantId: string }) {
    const success = await this.calendarService.deleteCalendarEvent(
      data.appointmentId,
    );
    return { success };
  }

  private async handleBulkSync(data: {
    appointmentIds: string[];
    tenantId: string;
  }) {
    const results: Array<{
      appointmentId: string;
      success: boolean;
      eventId?: string | null;
      error?: string;
    }> = [];

    for (const appointmentId of data.appointmentIds) {
      try {
        const eventId =
          await this.calendarService.syncAppointmentToCalendar(appointmentId);
        results.push({ appointmentId, success: !!eventId, eventId });
      } catch (error) {
        results.push({
          appointmentId,
          success: false,
          error: error.message,
        });
      }
      // Small delay between items to avoid rate limits
      await this.delay(100);
    }
    return { results };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<CalendarJobData>) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<CalendarJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
