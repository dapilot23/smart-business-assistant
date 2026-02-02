import { Test, TestingModule } from '@nestjs/testing';
import { TaskLedgerEngagementHandler } from './task-ledger-engagement.handler';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { ReviewRequestsService } from '../review-requests/review-requests.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TaskLedgerEngagementHandler', () => {
  let handler: TaskLedgerEngagementHandler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let sms: { sendAppointmentConfirmation: jest.Mock };
  let reviewRequests: {
    createReviewRequest: jest.Mock;
    sendReviewRequest: jest.Mock;
  };

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    sms = {
      sendAppointmentConfirmation: jest.fn(),
    };
    reviewRequests = {
      createReviewRequest: jest.fn(),
      sendReviewRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerEngagementHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: SmsService, useValue: sms },
        { provide: ReviewRequestsService, useValue: reviewRequests },
      ],
    }).compile();

    handler = module.get<TaskLedgerEngagementHandler>(
      TaskLedgerEngagementHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('confirms appointments by appointment id when provided', async () => {
    const appointment = {
      id: 'appt-1',
      tenantId,
      scheduledAt: new Date('2024-01-05T10:00:00Z'),
      duration: 60,
      customer: { name: 'Ada Lovelace', phone: '+15551234567' },
      service: { name: 'Tune-up' },
    };

    prisma.appointment.findMany.mockResolvedValue([appointment]);
    prisma.appointment.update.mockResolvedValue({
      ...appointment,
      status: 'CONFIRMED',
      confirmedAt: new Date('2024-01-05T10:05:00Z'),
    });

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-05T09:00:00Z'),
      appointmentId: 'appt-1',
    };

    await handler.handleAppointmentConfirmation(payload as any);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith({
      where: { tenantId, id: { in: ['appt-1'] } },
      include: { customer: true, service: true },
    });
    expect(sms.sendAppointmentConfirmation).toHaveBeenCalledWith(
      appointment,
      appointment.customer,
    );
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-1' },
      data: { status: 'CONFIRMED', confirmedAt: expect.any(Date) },
    });
  });

  it('fetches unconfirmed appointments when no ids are provided', async () => {
    const now = new Date('2024-04-10T15:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    prisma.appointment.findMany.mockResolvedValue([]);

    const payload = {
      tenantId,
      timestamp: now,
      payload: {
        count: 3,
      },
    };

    await handler.handleAppointmentConfirmation(payload as any);

    const callArgs = prisma.appointment.findMany.mock.calls[0][0];
    const expectedToday = new Date(now);
    expectedToday.setHours(0, 0, 0, 0);
    const expectedTomorrow = new Date(expectedToday);
    expectedTomorrow.setDate(expectedTomorrow.getDate() + 2);

    expect(callArgs.where).toEqual(
      expect.objectContaining({
        tenantId,
        status: 'SCHEDULED',
        confirmedAt: null,
      }),
    );
    expect(callArgs.where.scheduledAt.gte.getTime()).toBe(
      expectedToday.getTime(),
    );
    expect(callArgs.where.scheduledAt.lt.getTime()).toBe(
      expectedTomorrow.getTime(),
    );
    expect(callArgs.orderBy).toEqual({ scheduledAt: 'asc' });
    expect(callArgs.take).toBe(3);
  });

  it('skips confirmation when customer phone is missing', async () => {
    const appointment = {
      id: 'appt-2',
      tenantId,
      scheduledAt: new Date('2024-01-06T10:00:00Z'),
      duration: 30,
      customer: { name: 'No Phone', phone: '' },
      service: { name: 'Inspection' },
    };

    prisma.appointment.findMany.mockResolvedValue([appointment]);

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-06T09:00:00Z'),
      payload: {
        appointmentIds: ['appt-2'],
      },
    };

    await handler.handleAppointmentConfirmation(payload as any);

    expect(sms.sendAppointmentConfirmation).not.toHaveBeenCalled();
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('creates review requests for provided job ids', async () => {
    reviewRequests.createReviewRequest.mockImplementation(
      async (_tenantId: string, jobId: string) => ({ id: `req-${jobId}` }),
    );
    reviewRequests.sendReviewRequest.mockResolvedValue({ success: true });

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-07T09:00:00Z'),
      jobId: 'job-1',
      payload: {
        jobIds: ['job-2'],
      },
    };

    await handler.handleReviewRequest(payload as any);

    expect(prisma.job.findMany).not.toHaveBeenCalled();
    expect(reviewRequests.createReviewRequest).toHaveBeenCalledTimes(2);
    expect(reviewRequests.createReviewRequest).toHaveBeenCalledWith(
      tenantId,
      'job-1',
    );
    expect(reviewRequests.createReviewRequest).toHaveBeenCalledWith(
      tenantId,
      'job-2',
    );
    expect(reviewRequests.sendReviewRequest).toHaveBeenCalledWith(
      tenantId,
      'req-job-1',
    );
    expect(reviewRequests.sendReviewRequest).toHaveBeenCalledWith(
      tenantId,
      'req-job-2',
    );
  });

  it('creates review requests for recent customers when scope is provided', async () => {
    const now = new Date('2024-05-15T12:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    prisma.job.findMany.mockResolvedValue([{ id: 'job-10' }, { id: 'job-11' }]);
    reviewRequests.createReviewRequest.mockImplementation(
      async (_tenantId: string, jobId: string) => ({ id: `req-${jobId}` }),
    );
    reviewRequests.sendReviewRequest.mockResolvedValue({ success: true });

    const payload = {
      tenantId,
      timestamp: now,
      payload: {
        scope: 'recent_customers',
        limit: 2,
      },
    };

    await handler.handleReviewRequest(payload as any);

    const expectedCutoff = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    const callArgs = prisma.job.findMany.mock.calls[0][0];

    expect(callArgs.where).toEqual(
      expect.objectContaining({
        tenantId,
        status: 'COMPLETED',
        reviewRequest: { is: null },
      }),
    );
    expect(callArgs.where.completedAt.gte.getTime()).toBe(
      expectedCutoff.getTime(),
    );
    expect(callArgs.orderBy).toEqual({ completedAt: 'desc' });
    expect(callArgs.take).toBe(2);

    expect(reviewRequests.createReviewRequest).toHaveBeenCalledTimes(2);
    expect(reviewRequests.sendReviewRequest).toHaveBeenCalledWith(
      tenantId,
      'req-job-10',
    );
    expect(reviewRequests.sendReviewRequest).toHaveBeenCalledWith(
      tenantId,
      'req-job-11',
    );
  });
});
