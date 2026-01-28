import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  ReminderSchedulerService,
  APPOINTMENT_REMINDER_QUEUE,
} from './reminder-scheduler.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('ReminderSchedulerService', () => {
  let service: ReminderSchedulerService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let mockQueue: { add: jest.Mock; getJob: jest.Mock };

  const mockTenantId = 'tenant-123';
  const mockAppointmentId = 'appointment-456';
  const mockCustomerId = 'customer-789';
  const mockServiceId = 'service-101';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567890',
  };

  const mockServiceRecord = {
    id: mockServiceId,
    tenantId: mockTenantId,
    name: 'Plumbing Repair',
    durationMinutes: 90,
  };

  // Schedule far enough in the future so all 3 reminder steps pass
  // the filter (48h, 24h, 2h before scheduledAt must be > now)
  const futureDate = new Date(
    Date.now() + 72 * 60 * 60 * 1000,
  );

  const mockAppointment = {
    id: mockAppointmentId,
    tenantId: mockTenantId,
    customerId: mockCustomerId,
    serviceId: mockServiceId,
    scheduledAt: futureDate,
    status: 'SCHEDULED',
    customer: mockCustomer,
    service: mockServiceRecord,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderSchedulerService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: getQueueToken(APPOINTMENT_REMINDER_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ReminderSchedulerService>(
      ReminderSchedulerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleReminders', () => {
    it('should create reminder records and enqueue jobs', async () => {
      prisma.tenantSettings.findUnique.mockResolvedValue({
        tenantId: mockTenantId,
        appointmentReminders: true,
      });
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      // Each create call returns a record with an id
      let createCallIndex = 0;
      prisma.appointmentReminder.create.mockImplementation(
        async ({ data }) => ({
          id: `reminder-${++createCallIndex}`,
          ...data,
        }),
      );

      await service.scheduleReminders(mockAppointmentId, mockTenantId);

      // Should look up tenant settings
      expect(prisma.tenantSettings.findUnique).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });

      // Should look up the appointment with customer and service
      expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: mockAppointmentId },
        include: { customer: true, service: true },
      });

      // All 3 steps should be created (72h from now gives room)
      expect(prisma.appointmentReminder.create).toHaveBeenCalledTimes(3);

      // Verify step data for the first create call
      const firstCallData =
        prisma.appointmentReminder.create.mock.calls[0][0].data;
      expect(firstCallData).toMatchObject({
        tenantId: mockTenantId,
        appointmentId: mockAppointmentId,
        step: 1,
        channel: 'EMAIL',
        status: 'PENDING',
      });

      // Should enqueue 3 jobs
      expect(mockQueue.add).toHaveBeenCalledTimes(3);

      // Verify the first queue job structure
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-appointment-reminder',
        expect.objectContaining({
          tenantId: mockTenantId,
          appointmentId: mockAppointmentId,
          reminderId: 'reminder-1',
          step: 1,
          channel: 'EMAIL',
        }),
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: 'appt-reminder-reminder-1',
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        }),
      );
    });

    it('should skip when reminders are disabled', async () => {
      prisma.tenantSettings.findUnique.mockResolvedValue({
        tenantId: mockTenantId,
        appointmentReminders: false,
      });

      await service.scheduleReminders(mockAppointmentId, mockTenantId);

      expect(prisma.appointment.findUnique).not.toHaveBeenCalled();
      expect(prisma.appointmentReminder.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should skip when appointment is not found', async () => {
      prisma.tenantSettings.findUnique.mockResolvedValue({
        tenantId: mockTenantId,
        appointmentReminders: true,
      });
      prisma.appointment.findUnique.mockResolvedValue(null);

      await service.scheduleReminders(mockAppointmentId, mockTenantId);

      expect(prisma.appointmentReminder.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should proceed when no tenant settings exist', async () => {
      prisma.tenantSettings.findUnique.mockResolvedValue(null);
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      prisma.appointmentReminder.create.mockImplementation(
        async ({ data }) => ({ id: 'reminder-new', ...data }),
      );

      await service.scheduleReminders(mockAppointmentId, mockTenantId);

      // No settings means the guard `settings && !settings.appointmentReminders`
      // is false, so it should continue
      expect(prisma.appointment.findUnique).toHaveBeenCalled();
      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });

    it('should filter out reminders whose scheduled time has already passed', async () => {
      // Appointment only 3 hours from now -- only step 3 (2h before) should survive
      const soonDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const soonAppointment = { ...mockAppointment, scheduledAt: soonDate };

      prisma.tenantSettings.findUnique.mockResolvedValue(null);
      prisma.appointment.findUnique.mockResolvedValue(soonAppointment);
      prisma.appointmentReminder.create.mockImplementation(
        async ({ data }) => ({ id: 'reminder-only', ...data }),
      );

      await service.scheduleReminders(mockAppointmentId, mockTenantId);

      // Only step 3 (2 hours before) should be created
      expect(prisma.appointmentReminder.create).toHaveBeenCalledTimes(1);
      const createdData =
        prisma.appointmentReminder.create.mock.calls[0][0].data;
      expect(createdData.step).toBe(3);
      expect(createdData.channel).toBe('SMS');

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelReminders', () => {
    const mockPendingReminders = [
      { id: 'reminder-a', appointmentId: mockAppointmentId, status: 'PENDING', step: 1 },
      { id: 'reminder-b', appointmentId: mockAppointmentId, status: 'PENDING', step: 2 },
    ];

    it('should cancel pending reminders and remove queue jobs', async () => {
      prisma.appointmentReminder.findMany.mockResolvedValue(
        mockPendingReminders,
      );
      prisma.appointmentReminder.updateMany.mockResolvedValue({ count: 2 });

      const mockJobA = { remove: jest.fn() };
      const mockJobB = { remove: jest.fn() };
      mockQueue.getJob
        .mockResolvedValueOnce(mockJobA)
        .mockResolvedValueOnce(mockJobB);

      await service.cancelReminders(mockAppointmentId);

      // Should query for pending reminders
      expect(prisma.appointmentReminder.findMany).toHaveBeenCalledWith({
        where: { appointmentId: mockAppointmentId, status: 'PENDING' },
      });

      // Should update all pending to CANCELLED
      expect(prisma.appointmentReminder.updateMany).toHaveBeenCalledWith({
        where: { appointmentId: mockAppointmentId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      // Should look up and remove each job from the queue
      expect(mockQueue.getJob).toHaveBeenCalledWith('appt-reminder-reminder-a');
      expect(mockQueue.getJob).toHaveBeenCalledWith('appt-reminder-reminder-b');
      expect(mockJobA.remove).toHaveBeenCalled();
      expect(mockJobB.remove).toHaveBeenCalled();
    });

    it('should handle no pending reminders gracefully', async () => {
      prisma.appointmentReminder.findMany.mockResolvedValue([]);

      await service.cancelReminders(mockAppointmentId);

      expect(prisma.appointmentReminder.updateMany).not.toHaveBeenCalled();
      expect(mockQueue.getJob).not.toHaveBeenCalled();
    });

    it('should handle job not found in queue', async () => {
      prisma.appointmentReminder.findMany.mockResolvedValue([
        mockPendingReminders[0],
      ]);
      prisma.appointmentReminder.updateMany.mockResolvedValue({ count: 1 });

      // getJob returns null -- job already gone
      mockQueue.getJob.mockResolvedValue(null);

      await service.cancelReminders(mockAppointmentId);

      expect(mockQueue.getJob).toHaveBeenCalledWith('appt-reminder-reminder-a');
      // Should not throw
    });

    it('should continue cancelling remaining jobs when one removal fails', async () => {
      prisma.appointmentReminder.findMany.mockResolvedValue(
        mockPendingReminders,
      );
      prisma.appointmentReminder.updateMany.mockResolvedValue({ count: 2 });

      const mockJobB = { remove: jest.fn() };
      mockQueue.getJob
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockResolvedValueOnce(mockJobB);

      await service.cancelReminders(mockAppointmentId);

      // Despite the first job failing, the second should still be processed
      expect(mockQueue.getJob).toHaveBeenCalledTimes(2);
      expect(mockJobB.remove).toHaveBeenCalled();
    });
  });

  describe('getReminderMessage', () => {
    const customerName = 'Jane Smith';
    const serviceName = 'Plumbing Repair';
    const dateStr = 'January 30, 2026';
    const timeStr = '10:00 AM';
    const manageToken = 'token-abc-123';

    it('should return correct message for step 1 (email, 48h)', () => {
      const result = service.getReminderMessage(
        1,
        customerName,
        serviceName,
        dateStr,
        timeStr,
        manageToken,
      );

      expect(result.subject).toBe(
        `Upcoming Appointment - ${serviceName} on ${dateStr}`,
      );
      expect(result.message).toContain(`Hi ${customerName}`);
      expect(result.message).toContain(serviceName);
      expect(result.message).toContain(dateStr);
      expect(result.message).toContain(timeStr);
      expect(result.message).toContain(`/booking/manage/${manageToken}`);
    });

    it('should return step 1 message without manage URL when no token', () => {
      const result = service.getReminderMessage(
        1,
        customerName,
        serviceName,
        dateStr,
        timeStr,
        null,
      );

      expect(result.message).toContain(`Hi ${customerName}`);
      expect(result.message).not.toContain('/booking/manage/');
    });

    it('should return correct message for step 2 (SMS, 24h)', () => {
      const result = service.getReminderMessage(
        2,
        customerName,
        serviceName,
        dateStr,
        timeStr,
      );

      expect(result.subject).toBe('');
      expect(result.message).toContain(`Reminder: ${customerName}`);
      expect(result.message).toContain(serviceName);
      expect(result.message).toContain('tomorrow');
      expect(result.message).toContain(timeStr);
      expect(result.message).toContain('Reply C to confirm or R to reschedule');
    });

    it('should return correct message for step 3 (SMS, 2h)', () => {
      const result = service.getReminderMessage(
        3,
        customerName,
        serviceName,
        dateStr,
        timeStr,
      );

      expect(result.subject).toBe('');
      expect(result.message).toContain(`Hi ${customerName}`);
      expect(result.message).toContain('technician is on the way');
      expect(result.message).toContain(serviceName);
      expect(result.message).toContain(timeStr);
      expect(result.message).toContain('See you soon!');
    });

    it('should return empty strings for an unknown step', () => {
      const result = service.getReminderMessage(
        99,
        customerName,
        serviceName,
        dateStr,
        timeStr,
      );

      expect(result.message).toBe('');
      expect(result.subject).toBe('');
    });
  });
});
