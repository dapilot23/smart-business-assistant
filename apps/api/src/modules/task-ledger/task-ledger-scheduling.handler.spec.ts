import { Test, TestingModule } from '@nestjs/testing';
import { TaskLedgerSchedulingHandler } from './task-ledger-scheduling.handler';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { NoshowPreventionService } from '../noshow-prevention/noshow-prevention.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TaskLedgerSchedulingHandler', () => {
  let handler: TaskLedgerSchedulingHandler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let sms: { sendAppointmentReminder: jest.Mock };
  let noshow: { markNoShow: jest.Mock };

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    sms = { sendAppointmentReminder: jest.fn() };
    noshow = { markNoShow: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerSchedulingHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: SmsService, useValue: sms },
        { provide: NoshowPreventionService, useValue: noshow },
      ],
    }).compile();

    handler = module.get<TaskLedgerSchedulingHandler>(
      TaskLedgerSchedulingHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('sends reminders for provided appointment ids', async () => {
    const appointment = {
      id: 'appt-1',
      tenantId,
      scheduledAt: new Date('2024-01-05T10:00:00Z'),
      duration: 60,
      customer: { name: 'Ada Lovelace', phone: '+15551234567' },
      service: { name: 'Tune-up' },
    };

    prisma.appointment.findMany.mockResolvedValue([appointment]);

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-05T09:00:00Z'),
      appointmentId: 'appt-1',
    };

    await handler.handleAppointmentReminder(payload as any);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith({
      where: { tenantId, id: { in: ['appt-1'] } },
      include: { customer: true, service: true },
    });
    expect(sms.sendAppointmentReminder).toHaveBeenCalledWith(
      appointment,
      appointment.customer,
    );
  });

  it('fetches appointments for today when no ids are provided', async () => {
    const now = new Date('2024-04-10T15:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    prisma.appointment.findMany.mockResolvedValue([]);

    const payload = {
      tenantId,
      timestamp: now,
      payload: { scope: 'today', count: 3 },
    };

    await handler.handleAppointmentReminder(payload as any);

    const callArgs = prisma.appointment.findMany.mock.calls[0][0];
    const expectedStart = new Date(now);
    expectedStart.setHours(0, 0, 0, 0);
    const expectedEnd = new Date(expectedStart.getTime() + 24 * 60 * 60 * 1000);

    expect(callArgs.where).toEqual(
      expect.objectContaining({
        tenantId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      }),
    );
    expect(callArgs.where.scheduledAt.gte.getTime()).toBe(
      expectedStart.getTime(),
    );
    expect(callArgs.where.scheduledAt.lt.getTime()).toBe(
      expectedEnd.getTime(),
    );
    expect(callArgs.take).toBe(3);
  });

  it('marks no-show for appointment ids', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-06T09:00:00Z'),
      appointmentId: 'appt-2',
      payload: {
        appointmentIds: ['appt-3'],
      },
    };

    await handler.handleNoShow(payload as any);

    expect(noshow.markNoShow).toHaveBeenCalledTimes(2);
    expect(noshow.markNoShow).toHaveBeenCalledWith('appt-2', tenantId);
    expect(noshow.markNoShow).toHaveBeenCalledWith('appt-3', tenantId);
  });
});
