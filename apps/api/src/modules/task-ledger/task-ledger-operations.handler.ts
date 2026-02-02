import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EVENTS, TaskActionEventPayload } from '../../config/events/events.types';
import { JobsService } from '../jobs/jobs.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { getJobIds, getPayloadString } from './task-ledger-action.utils';

@Injectable()
export class TaskLedgerOperationsHandler {
  private readonly logger = new Logger(TaskLedgerOperationsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly appointments: AppointmentsService,
  ) {}

  @OnEvent(EVENTS.TECHNICIAN_ASSIGNMENT_REQUESTED)
  async handleTechnicianAssignment(payload: TaskActionEventPayload) {
    const technicianId =
      getPayloadString(payload, 'technicianId') ||
      getPayloadString(payload, 'assignedTo');

    if (!technicianId) {
      this.logger.warn('Technician assignment requested without technicianId');
      return;
    }

    const appointmentId = getPayloadString(payload, 'appointmentId');
    if (appointmentId) {
      await this.assignAppointment(payload.tenantId, appointmentId, technicianId);
      return;
    }

    const jobIds = this.resolveJobIds(payload);
    if (jobIds.length === 0) {
      this.logger.warn('Technician assignment requested without jobId');
      return;
    }

    for (const jobId of jobIds) {
      await this.assignJob(payload.tenantId, jobId, technicianId);
    }
  }

  @OnEvent(EVENTS.JOB_STATUS_UPDATE_REQUESTED)
  async handleJobStatusUpdate(payload: TaskActionEventPayload) {
    const statusValue =
      getPayloadString(payload, 'status') ||
      getPayloadString(payload, 'jobStatus');

    if (!statusValue || !this.isValidJobStatus(statusValue)) {
      this.logger.warn('Job status update requested without valid status');
      return;
    }

    const jobIds = this.resolveJobIds(payload);
    if (jobIds.length === 0) {
      this.logger.warn('Job status update requested without jobId');
      return;
    }

    for (const jobId of jobIds) {
      await this.jobs.updateJobStatus(payload.tenantId, jobId, {
        status: statusValue as JobStatus,
      });
    }
  }

  private resolveJobIds(payload: TaskActionEventPayload): string[] {
    const ids = getJobIds(payload);
    if (payload.entityId) ids.unshift(payload.entityId);
    return Array.from(new Set(ids.filter(Boolean)));
  }

  private async assignAppointment(
    tenantId: string,
    appointmentId: string,
    technicianId: string,
  ) {
    await this.appointments.update(tenantId, appointmentId, {
      assignedTo: technicianId,
    });
  }

  private async assignJob(
    tenantId: string,
    jobId: string,
    technicianId: string,
  ) {
    const job = await this.jobs.getJob(tenantId, jobId);

    await this.appointments.update(tenantId, job.appointmentId, {
      assignedTo: technicianId,
    });

    await this.prisma.job.update({
      where: { id: jobId },
      data: { technicianId },
    });
  }

  private isValidJobStatus(value: string): value is JobStatus {
    return Object.values(JobStatus).includes(value as JobStatus);
  }
}
