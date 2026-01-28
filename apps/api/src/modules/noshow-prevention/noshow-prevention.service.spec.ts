import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NoshowPreventionService } from './noshow-prevention.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('NoshowPreventionService', () => {
  let service: NoshowPreventionService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const mockTenantId = 'tenant-123';
  const mockOtherTenantId = 'tenant-999';
  const mockAppointmentId = 'appointment-456';
  const mockCustomerId = 'customer-789';
  const mockServiceId = 'service-101';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'John Doe',
    phone: '+1234567890',
    noShowCount: 1,
  };

  const mockService = {
    id: mockServiceId,
    tenantId: mockTenantId,
    name: 'Haircut',
    durationMinutes: 60,
  };

  const mockAppointment = {
    id: mockAppointmentId,
    tenantId: mockTenantId,
    customerId: mockCustomerId,
    serviceId: mockServiceId,
    scheduledAt: new Date('2024-12-15T10:00:00Z'),
    status: 'SCHEDULED',
    customer: mockCustomer,
    service: mockService,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoshowPreventionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NoshowPreventionService>(NoshowPreventionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markNoShow', () => {
    it('should mark an appointment as no-show and increment customer count', async () => {
      const updatedAppointment = {
        ...mockAppointment,
        status: 'NO_SHOW',
      };
      const updatedCustomer = {
        ...mockCustomer,
        noShowCount: 2,
      };

      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      prisma.appointment.update.mockResolvedValue(updatedAppointment);
      prisma.customer.update.mockResolvedValue(updatedCustomer);
      prisma.$transaction.mockResolvedValue([
        updatedAppointment,
        updatedCustomer,
      ]);

      const result = await service.markNoShow(mockAppointmentId, mockTenantId);

      expect(result).toEqual({
        appointmentId: mockAppointmentId,
        status: 'NO_SHOW',
        noShowCount: 2,
      });

      expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: mockAppointmentId },
        include: { customer: true },
      });

      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: mockAppointmentId },
        data: { status: 'NO_SHOW' },
      });

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: { noShowCount: { increment: 1 } },
      });

      // $transaction receives an array of promises (not resolved values)
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Promise), expect.any(Promise)]),
      );
    });

    it('should throw NotFoundException when appointment does not exist', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.markNoShow(mockAppointmentId, mockTenantId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.markNoShow(mockAppointmentId, mockTenantId),
      ).rejects.toThrow('Appointment not found');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when tenantId does not match', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(
        service.markNoShow(mockAppointmentId, mockOtherTenantId),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.markNoShow(mockAppointmentId, mockOtherTenantId),
      ).rejects.toThrow('Access denied');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('isHighRisk', () => {
    it('should return true when noShowCount is >= 2', async () => {
      prisma.customer.findUnique.mockResolvedValue({ noShowCount: 3 });

      const result = await service.isHighRisk(mockCustomerId);

      expect(result).toBe(true);
      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        select: { noShowCount: true },
      });
    });

    it('should return true when noShowCount is exactly 2', async () => {
      prisma.customer.findUnique.mockResolvedValue({ noShowCount: 2 });

      const result = await service.isHighRisk(mockCustomerId);

      expect(result).toBe(true);
    });

    it('should return false when noShowCount is less than 2', async () => {
      prisma.customer.findUnique.mockResolvedValue({ noShowCount: 1 });

      const result = await service.isHighRisk(mockCustomerId);

      expect(result).toBe(false);
    });

    it('should return false when noShowCount is 0', async () => {
      prisma.customer.findUnique.mockResolvedValue({ noShowCount: 0 });

      const result = await service.isHighRisk(mockCustomerId);

      expect(result).toBe(false);
    });

    it('should return false when customer is not found', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      const result = await service.isHighRisk(mockCustomerId);

      expect(result).toBe(false);
      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        select: { noShowCount: true },
      });
    });
  });

  describe('getNoShowAnalytics', () => {
    it('should return correct analytics structure with rate calculation', async () => {
      const noShowAppointments = [
        {
          ...mockAppointment,
          status: 'NO_SHOW',
          scheduledAt: new Date('2024-12-09T10:00:00Z'), // Monday
          service: { name: 'Haircut' },
          customer: mockCustomer,
        },
        {
          ...mockAppointment,
          id: 'appointment-002',
          status: 'NO_SHOW',
          scheduledAt: new Date('2024-12-09T14:00:00Z'), // Monday
          service: { name: 'Haircut' },
          customer: { ...mockCustomer, id: 'customer-002' },
        },
        {
          ...mockAppointment,
          id: 'appointment-003',
          status: 'NO_SHOW',
          scheduledAt: new Date('2024-12-11T09:00:00Z'), // Wednesday
          service: { name: 'Coloring' },
          customer: { ...mockCustomer, id: 'customer-003' },
        },
      ];

      const repeatOffenders = [
        {
          id: mockCustomerId,
          name: 'John Doe',
          phone: '+1234567890',
          noShowCount: 5,
        },
        {
          id: 'customer-002',
          name: 'Jane Doe',
          phone: '+0987654321',
          noShowCount: 3,
        },
      ];

      prisma.appointment.findMany.mockResolvedValue(noShowAppointments);
      prisma.appointment.count.mockResolvedValue(10);
      prisma.customer.findMany.mockResolvedValue(repeatOffenders);

      const result = await service.getNoShowAnalytics(mockTenantId);

      expect(result.totalNoShows).toBe(3);
      // rate = 3/10 = 0.3 => Math.round(0.3 * 1000) / 10 = 30
      expect(result.noShowRate).toBe(30);
      expect(result.byService).toEqual({
        Haircut: 2,
        Coloring: 1,
      });
      expect(result.byDayOfWeek).toEqual({
        Monday: 2,
        Wednesday: 1,
      });
      expect(result.repeatOffenders).toEqual(repeatOffenders);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, status: 'NO_SHOW' },
        include: { service: true, customer: true },
      });

      expect(prisma.appointment.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: { in: ['COMPLETED', 'NO_SHOW'] },
        },
      });

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, noShowCount: { gte: 2 } },
        select: { id: true, name: true, phone: true, noShowCount: true },
        orderBy: { noShowCount: 'desc' },
        take: 10,
      });
    });

    it('should return zero rate when total appointments is 0', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.appointment.count.mockResolvedValue(0);
      prisma.customer.findMany.mockResolvedValue([]);

      const result = await service.getNoShowAnalytics(mockTenantId);

      expect(result.totalNoShows).toBe(0);
      expect(result.noShowRate).toBe(0);
      expect(result.byService).toEqual({});
      expect(result.byDayOfWeek).toEqual({});
      expect(result.repeatOffenders).toEqual([]);
    });

    it('should handle appointments with missing service names', async () => {
      const noShowAppointments = [
        {
          ...mockAppointment,
          status: 'NO_SHOW',
          scheduledAt: new Date('2024-12-10T10:00:00Z'), // Tuesday
          service: null,
          customer: mockCustomer,
        },
      ];

      prisma.appointment.findMany.mockResolvedValue(noShowAppointments);
      prisma.appointment.count.mockResolvedValue(5);
      prisma.customer.findMany.mockResolvedValue([]);

      const result = await service.getNoShowAnalytics(mockTenantId);

      expect(result.totalNoShows).toBe(1);
      // rate = 1/5 = 0.2 => Math.round(0.2 * 1000) / 10 = 20
      expect(result.noShowRate).toBe(20);
      expect(result.byService).toEqual({ Unknown: 1 });
      expect(result.byDayOfWeek).toEqual({ Tuesday: 1 });
    });
  });
});
