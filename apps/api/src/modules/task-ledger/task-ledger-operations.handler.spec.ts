import { Test, TestingModule } from '@nestjs/testing';
import { TaskLedgerOperationsHandler } from './task-ledger-operations.handler';
import { PrismaService } from '../../config/prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TaskLedgerOperationsHandler', () => {
  let handler: TaskLedgerOperationsHandler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let jobs: { getJob: jest.Mock; updateJobStatus: jest.Mock };
  let appointments: { update: jest.Mock };

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    jobs = {
      getJob: jest.fn(),
      updateJobStatus: jest.fn(),
    };
    appointments = { update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerOperationsHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: JobsService, useValue: jobs },
        { provide: AppointmentsService, useValue: appointments },
      ],
    }).compile();

    handler = module.get<TaskLedgerOperationsHandler>(TaskLedgerOperationsHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('assigns technician for job id', async () => {
    jobs.getJob.mockResolvedValue({
      id: 'job-1',
      appointmentId: 'appt-1',
    });

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      jobId: 'job-1',
      payload: { technicianId: 'tech-1' },
    };

    await handler.handleTechnicianAssignment(payload as any);

    expect(jobs.getJob).toHaveBeenCalledWith(tenantId, 'job-1');
    expect(appointments.update).toHaveBeenCalledWith(tenantId, 'appt-1', {
      assignedTo: 'tech-1',
    });
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { technicianId: 'tech-1' },
    });
  });

  it('updates job status when valid status provided', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      jobId: 'job-2',
      payload: { status: 'COMPLETED' },
    };

    await handler.handleJobStatusUpdate(payload as any);

    expect(jobs.updateJobStatus).toHaveBeenCalledWith(tenantId, 'job-2', {
      status: 'COMPLETED',
    });
  });
});
