import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import { AppointmentsValidatorsService } from './appointments-validators.service';
import { ReminderSchedulerService } from '../noshow-prevention/reminder-scheduler.service';
import { NoshowPreventionService } from '../noshow-prevention/noshow-prevention.service';
import { createMockPrismaService } from '../../test/prisma-mock';
import { EVENTS } from '../../config/events/events.types';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let validators: jest.Mocked<AppointmentsValidatorsService>;
  let eventsService: jest.Mocked<EventsService>;
  let reminderScheduler: jest.Mocked<ReminderSchedulerService>;
  let noshowService: jest.Mocked<NoshowPreventionService>;

  const mockTenantId = 'tenant-123';
  const mockAppointmentId = 'appointment-456';
  const mockCustomerId = 'customer-789';
  const mockServiceId = 'service-101';
  const mockUserId = 'user-202';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  };

  const mockService = {
    id: mockServiceId,
    tenantId: mockTenantId,
    name: 'Haircut',
    durationMinutes: 60,
  };

  const mockUser = {
    id: mockUserId,
    tenantId: mockTenantId,
    name: 'Barber Joe',
    email: 'joe@example.com',
  };

  const mockAppointment = {
    id: mockAppointmentId,
    tenantId: mockTenantId,
    customerId: mockCustomerId,
    serviceId: mockServiceId,
    assignedTo: mockUserId,
    scheduledAt: new Date('2024-12-15T10:00:00Z'),
    duration: 60,
    status: 'SCHEDULED',
    notes: 'Test appointment',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    customer: mockCustomer,
    service: mockService,
    assignedUser: mockUser,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    validators = {
      validateCustomer: jest.fn(),
      validateService: jest.fn(),
      validateUser: jest.fn(),
      checkSchedulingConflicts: jest.fn(),
    } as any;
    eventsService = {
      emit: jest.fn(),
    } as any;
    reminderScheduler = {
      scheduleReminders: jest.fn(),
      cancelReminders: jest.fn(),
    } as any;
    noshowService = {
      markNoShow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppointmentsValidatorsService, useValue: validators },
        { provide: EventsService, useValue: eventsService },
        { provide: ReminderSchedulerService, useValue: reminderScheduler },
        { provide: NoshowPreventionService, useValue: noshowService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return appointments for tenant with filters', async () => {
      const mockAppointments = [mockAppointment];
      prisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const filters = {
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        status: 'SCHEDULED',
        assignedTo: mockUserId,
      };

      const result = await service.findAll(mockTenantId, filters);

      expect(result).toEqual(mockAppointments);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          scheduledAt: {
            gte: new Date('2024-12-01'),
            lte: new Date('2024-12-31'),
          },
          status: 'SCHEDULED',
          assignedTo: mockUserId,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true, durationMinutes: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should return all appointments when no filters provided', async () => {
      const mockAppointments = [mockAppointment];
      prisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const result = await service.findAll(mockTenantId);

      expect(result).toEqual(mockAppointments);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        include: expect.any(Object),
        orderBy: { scheduledAt: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should return appointment when tenant matches', async () => {
      prisma.appointment.findFirst.mockResolvedValue(mockAppointment);

      const result = await service.findById(mockTenantId, mockAppointmentId);

      expect(result).toEqual(mockAppointment);
      expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
        where: { id: mockAppointmentId, tenantId: mockTenantId },
        include: {
          customer: true,
          service: true,
          assignedUser: { select: { id: true, name: true, email: true } },
        },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockTenantId, mockAppointmentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tenant does not match', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockTenantId, mockAppointmentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should validate customer, service, and user belong to tenant', async () => {
      const createDto = {
        customerId: mockCustomerId,
        serviceId: mockServiceId,
        assignedTo: mockUserId,
        scheduledAt: '2024-12-15T10:00:00Z',
        notes: 'Test appointment',
      };

      validators.validateCustomer.mockResolvedValue(mockCustomer);
      validators.validateService.mockResolvedValue(mockService);
      validators.validateUser.mockResolvedValue(mockUser);
      validators.checkSchedulingConflicts.mockResolvedValue(undefined);
      prisma.appointment.create.mockResolvedValue(mockAppointment);

      await service.create(mockTenantId, createDto);

      expect(validators.validateCustomer).toHaveBeenCalledWith(mockTenantId, mockCustomerId);
      expect(validators.validateService).toHaveBeenCalledWith(mockTenantId, mockServiceId);
      expect(validators.validateUser).toHaveBeenCalledWith(mockTenantId, mockUserId);
    });

    it('should emit APPOINTMENT_CREATED event', async () => {
      const createDto = {
        customerId: mockCustomerId,
        serviceId: mockServiceId,
        assignedTo: mockUserId,
        scheduledAt: '2024-12-15T10:00:00Z',
      };

      validators.validateCustomer.mockResolvedValue(mockCustomer);
      validators.validateService.mockResolvedValue(mockService);
      validators.validateUser.mockResolvedValue(mockUser);
      validators.checkSchedulingConflicts.mockResolvedValue(undefined);
      prisma.appointment.create.mockResolvedValue(mockAppointment);

      await service.create(mockTenantId, createDto);

      expect(eventsService.emit).toHaveBeenCalledWith(
        EVENTS.APPOINTMENT_CREATED,
        expect.objectContaining({
          tenantId: mockTenantId,
          appointmentId: mockAppointmentId,
        }),
      );
    });

    it('should schedule reminders', async () => {
      const createDto = {
        customerId: mockCustomerId,
        scheduledAt: '2024-12-15T10:00:00Z',
      };

      validators.validateCustomer.mockResolvedValue(mockCustomer);
      validators.checkSchedulingConflicts.mockResolvedValue(undefined);
      prisma.appointment.create.mockResolvedValue(mockAppointment);
      reminderScheduler.scheduleReminders.mockResolvedValue(undefined);

      await service.create(mockTenantId, createDto);

      expect(reminderScheduler.scheduleReminders).toHaveBeenCalledWith(
        mockAppointmentId,
        mockTenantId,
      );
    });

    it('should use service duration when serviceId is provided', async () => {
      const createDto = {
        customerId: mockCustomerId,
        serviceId: mockServiceId,
        scheduledAt: '2024-12-15T10:00:00Z',
      };

      validators.validateCustomer.mockResolvedValue(mockCustomer);
      validators.validateService.mockResolvedValue(mockService);
      validators.checkSchedulingConflicts.mockResolvedValue(undefined);
      prisma.appointment.create.mockResolvedValue(mockAppointment);

      await service.create(mockTenantId, createDto);

      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duration: 60,
          }),
        }),
      );
    });

    it('should use default duration when no serviceId provided', async () => {
      const createDto = {
        customerId: mockCustomerId,
        scheduledAt: '2024-12-15T10:00:00Z',
      };

      validators.validateCustomer.mockResolvedValue(mockCustomer);
      validators.checkSchedulingConflicts.mockResolvedValue(undefined);
      prisma.appointment.create.mockResolvedValue(mockAppointment);

      await service.create(mockTenantId, createDto);

      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duration: 60,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should validate updated fields', async () => {
      const updateDto = {
        customerId: 'new-customer-id',
        serviceId: 'new-service-id',
        assignedTo: 'new-user-id',
      };

      const newCustomer = { ...mockCustomer, id: 'new-customer-id' };
      const newService = { ...mockService, id: 'new-service-id' };
      const newUser = { ...mockUser, id: 'new-user-id' };

      prisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      validators.validateCustomer.mockResolvedValue(newCustomer);
      validators.validateService.mockResolvedValue(newService);
      validators.validateUser.mockResolvedValue(newUser);
      validators.checkSchedulingConflicts.mockResolvedValue(undefined);
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, ...updateDto });

      await service.update(mockTenantId, mockAppointmentId, updateDto);

      expect(validators.validateCustomer).toHaveBeenCalledWith(mockTenantId, 'new-customer-id');
      expect(validators.validateService).toHaveBeenCalledWith(mockTenantId, 'new-service-id');
      expect(validators.validateUser).toHaveBeenCalledWith(mockTenantId, 'new-user-id');
    });

    it('should reschedule reminders when scheduledAt changes', async () => {
      const updateDto = {
        scheduledAt: '2024-12-20T15:00:00Z',
      };

      prisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      validators.checkSchedulingConflicts.mockResolvedValue(undefined);
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, ...updateDto });
      reminderScheduler.cancelReminders.mockResolvedValue(undefined);
      reminderScheduler.scheduleReminders.mockResolvedValue(undefined);

      await service.update(mockTenantId, mockAppointmentId, updateDto);

      expect(reminderScheduler.cancelReminders).toHaveBeenCalledWith(mockAppointmentId);
      expect(reminderScheduler.scheduleReminders).toHaveBeenCalledWith(
        mockAppointmentId,
        mockTenantId,
      );
    });

    it('should emit APPOINTMENT_UPDATED event', async () => {
      const updateDto = { notes: 'Updated notes' };

      prisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, ...updateDto });

      await service.update(mockTenantId, mockAppointmentId, updateDto);

      expect(eventsService.emit).toHaveBeenCalledWith(
        EVENTS.APPOINTMENT_UPDATED,
        expect.objectContaining({
          tenantId: mockTenantId,
          appointmentId: mockAppointmentId,
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should set CANCELLED status and cancel reminders', async () => {
      const cancelledAppointment = { ...mockAppointment, status: 'CANCELLED' };

      prisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      prisma.appointment.update.mockResolvedValue(cancelledAppointment);
      reminderScheduler.cancelReminders.mockResolvedValue(undefined);

      const result = await service.cancel(mockTenantId, mockAppointmentId);

      expect(result.status).toBe('CANCELLED');
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: mockAppointmentId },
        data: { status: 'CANCELLED' },
        include: {
          customer: true,
          service: true,
          assignedUser: { select: { id: true, name: true, email: true } },
        },
      });
      expect(reminderScheduler.cancelReminders).toHaveBeenCalledWith(mockAppointmentId);
    });

    it('should emit APPOINTMENT_CANCELLED event', async () => {
      const cancelledAppointment = { ...mockAppointment, status: 'CANCELLED' };

      prisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      prisma.appointment.update.mockResolvedValue(cancelledAppointment);
      reminderScheduler.cancelReminders.mockResolvedValue(undefined);

      await service.cancel(mockTenantId, mockAppointmentId);

      expect(eventsService.emit).toHaveBeenCalledWith(
        EVENTS.APPOINTMENT_CANCELLED,
        expect.objectContaining({
          tenantId: mockTenantId,
          appointmentId: mockAppointmentId,
        }),
      );
    });

    it('should throw NotFoundException if appointment does not exist', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.cancel(mockTenantId, mockAppointmentId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.appointment.update).not.toHaveBeenCalled();
      expect(reminderScheduler.cancelReminders).not.toHaveBeenCalled();
    });
  });
});
