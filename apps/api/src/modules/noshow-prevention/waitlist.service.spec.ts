import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createMockPrismaService } from '../../test/prisma-mock';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notifications: { queueSms: jest.Mock; queueEmail: jest.Mock };

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';
  const mockServiceId = 'service-789';
  const mockWaitlistId = 'waitlist-001';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockService = {
    id: mockServiceId,
    tenantId: mockTenantId,
    name: 'Haircut',
    duration: 30,
    price: 25,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockWaitlistEntry = {
    id: mockWaitlistId,
    tenantId: mockTenantId,
    customerId: mockCustomerId,
    serviceId: mockServiceId,
    preferredDate: new Date('2024-06-15'),
    preferredStart: '09:00',
    preferredEnd: '12:00',
    notes: 'Morning preferred',
    status: 'WAITING',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    notifiedAt: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    customer: mockCustomer,
    service: mockService,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notifications = { queueSms: jest.fn(), queueEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToWaitlist', () => {
    const dto: CreateWaitlistDto = {
      customerId: mockCustomerId,
      serviceId: mockServiceId,
      preferredDate: '2024-06-15',
      preferredStart: '09:00',
      preferredEnd: '12:00',
      notes: 'Morning preferred',
    };

    it('should successfully add a customer to the waitlist', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.service.findFirst.mockResolvedValue(mockService);
      prisma.waitlist.create.mockResolvedValue(mockWaitlistEntry);

      const result = await service.addToWaitlist(dto, mockTenantId);

      expect(result).toEqual(mockWaitlistEntry);
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
      });
      expect(prisma.service.findFirst).toHaveBeenCalledWith({
        where: { id: mockServiceId, tenantId: mockTenantId },
      });
      expect(prisma.waitlist.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          customerId: dto.customerId,
          serviceId: dto.serviceId,
          preferredDate: new Date(dto.preferredDate),
          preferredStart: dto.preferredStart,
          preferredEnd: dto.preferredEnd,
          notes: dto.notes,
          expiresAt: expect.any(Date),
          status: 'WAITING',
        },
        include: { customer: true, service: true },
      });
    });

    it('should add to waitlist without serviceId', async () => {
      const dtoNoService: CreateWaitlistDto = {
        customerId: mockCustomerId,
        preferredDate: '2024-06-15',
      };
      const entryNoService = {
        ...mockWaitlistEntry,
        serviceId: undefined,
        service: null,
      };

      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.waitlist.create.mockResolvedValue(entryNoService);

      const result = await service.addToWaitlist(dtoNoService, mockTenantId);

      expect(result).toEqual(entryNoService);
      expect(prisma.service.findFirst).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.addToWaitlist(dto, mockTenantId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addToWaitlist(dto, mockTenantId),
      ).rejects.toThrow('Customer not found');

      expect(prisma.waitlist.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when service not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.addToWaitlist(dto, mockTenantId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addToWaitlist(dto, mockTenantId),
      ).rejects.toThrow('Service not found');

      expect(prisma.waitlist.create).not.toHaveBeenCalled();
    });
  });

  describe('getWaitlist', () => {
    it('should return filtered waitlist entries with default status', async () => {
      const mockEntries = [mockWaitlistEntry];
      prisma.waitlist.findMany.mockResolvedValue(mockEntries);

      const result = await service.getWaitlist(mockTenantId);

      expect(result).toEqual(mockEntries);
      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: 'WAITING',
          expiresAt: { gte: expect.any(Date) },
        },
        include: { customer: true, service: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return filtered waitlist entries with custom status', async () => {
      const offeredEntry = { ...mockWaitlistEntry, status: 'OFFERED' };
      prisma.waitlist.findMany.mockResolvedValue([offeredEntry]);

      const result = await service.getWaitlist(mockTenantId, 'OFFERED');

      expect(result).toEqual([offeredEntry]);
      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: 'OFFERED',
          expiresAt: { gte: expect.any(Date) },
        },
        include: { customer: true, service: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when no entries match', async () => {
      prisma.waitlist.findMany.mockResolvedValue([]);

      const result = await service.getWaitlist(mockTenantId);

      expect(result).toEqual([]);
      expect(prisma.waitlist.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifyWaitlistForSlot', () => {
    const scheduledAt = new Date('2024-06-15T10:00:00Z');
    const duration = 30;

    it('should notify the first matching waitlist entry', async () => {
      prisma.waitlist.findFirst.mockResolvedValue(mockWaitlistEntry);
      notifications.queueSms.mockResolvedValue(undefined);
      prisma.waitlist.update.mockResolvedValue({
        ...mockWaitlistEntry,
        status: 'OFFERED',
        notifiedAt: expect.any(Date),
      });

      const result = await service.notifyWaitlistForSlot(
        mockTenantId,
        mockServiceId,
        scheduledAt,
        duration,
      );

      expect(result).toEqual(mockWaitlistEntry);
      expect(prisma.waitlist.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          serviceId: mockServiceId,
          status: 'WAITING',
          expiresAt: { gte: expect.any(Date) },
        },
        orderBy: { createdAt: 'asc' },
        include: { customer: true, service: true },
      });
      expect(notifications.queueSms).toHaveBeenCalledWith(
        mockCustomer.phone,
        expect.stringContaining('Haircut'),
        mockTenantId,
      );
      expect(prisma.waitlist.update).toHaveBeenCalledWith({
        where: { id: mockWaitlistEntry.id },
        data: { status: 'OFFERED', notifiedAt: expect.any(Date) },
      });
    });

    it('should return null when serviceId is null', async () => {
      const result = await service.notifyWaitlistForSlot(
        mockTenantId,
        null,
        scheduledAt,
        duration,
      );

      expect(result).toBeNull();
      expect(prisma.waitlist.findFirst).not.toHaveBeenCalled();
      expect(notifications.queueSms).not.toHaveBeenCalled();
    });

    it('should return null when no entries match', async () => {
      prisma.waitlist.findFirst.mockResolvedValue(null);

      const result = await service.notifyWaitlistForSlot(
        mockTenantId,
        mockServiceId,
        scheduledAt,
        duration,
      );

      expect(result).toBeNull();
      expect(notifications.queueSms).not.toHaveBeenCalled();
      expect(prisma.waitlist.update).not.toHaveBeenCalled();
    });

    it('should fall back to "service" when service name is missing', async () => {
      const entryNoServiceName = {
        ...mockWaitlistEntry,
        service: null,
      };
      prisma.waitlist.findFirst.mockResolvedValue(entryNoServiceName);
      notifications.queueSms.mockResolvedValue(undefined);
      prisma.waitlist.update.mockResolvedValue({
        ...entryNoServiceName,
        status: 'OFFERED',
      });

      await service.notifyWaitlistForSlot(
        mockTenantId,
        mockServiceId,
        scheduledAt,
        duration,
      );

      expect(notifications.queueSms).toHaveBeenCalledWith(
        mockCustomer.phone,
        expect.stringContaining('service'),
        mockTenantId,
      );
    });
  });

  describe('confirmWaitlistBooking', () => {
    const offeredEntry = {
      ...mockWaitlistEntry,
      status: 'OFFERED',
      notifiedAt: new Date(),
    };

    it('should successfully confirm a waitlist booking', async () => {
      prisma.waitlist.findUnique.mockResolvedValue(offeredEntry);
      prisma.waitlist.update.mockResolvedValue({
        ...offeredEntry,
        status: 'BOOKED',
      });

      const result = await service.confirmWaitlistBooking(
        mockWaitlistId,
        mockTenantId,
      );

      expect(result).toEqual({
        success: true,
        waitlistId: mockWaitlistId,
        customerId: mockCustomerId,
      });
      expect(prisma.waitlist.findUnique).toHaveBeenCalledWith({
        where: { id: mockWaitlistId },
        include: { customer: true, service: true },
      });
      expect(prisma.waitlist.update).toHaveBeenCalledWith({
        where: { id: mockWaitlistId },
        data: { status: 'BOOKED' },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      prisma.waitlist.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmWaitlistBooking(mockWaitlistId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.confirmWaitlistBooking(mockWaitlistId, mockTenantId),
      ).rejects.toThrow('Waitlist entry not found');

      expect(prisma.waitlist.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenantId does not match', async () => {
      prisma.waitlist.findUnique.mockResolvedValue({
        ...offeredEntry,
        tenantId: 'other-tenant',
      });

      await expect(
        service.confirmWaitlistBooking(mockWaitlistId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.confirmWaitlistBooking(mockWaitlistId, mockTenantId),
      ).rejects.toThrow('Waitlist entry not found');

      expect(prisma.waitlist.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when status is not OFFERED', async () => {
      prisma.waitlist.findUnique.mockResolvedValue(mockWaitlistEntry);

      await expect(
        service.confirmWaitlistBooking(mockWaitlistId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmWaitlistBooking(mockWaitlistId, mockTenantId),
      ).rejects.toThrow('Entry has not been offered a slot');

      expect(prisma.waitlist.update).not.toHaveBeenCalled();
    });
  });

  describe('removeFromWaitlist', () => {
    it('should successfully remove a waitlist entry', async () => {
      const cancelledEntry = { ...mockWaitlistEntry, status: 'CANCELLED' };
      prisma.waitlist.findUnique.mockResolvedValue(mockWaitlistEntry);
      prisma.waitlist.update.mockResolvedValue(cancelledEntry);

      const result = await service.removeFromWaitlist(
        mockWaitlistId,
        mockTenantId,
      );

      expect(result).toEqual(cancelledEntry);
      expect(prisma.waitlist.findUnique).toHaveBeenCalledWith({
        where: { id: mockWaitlistId },
      });
      expect(prisma.waitlist.update).toHaveBeenCalledWith({
        where: { id: mockWaitlistId },
        data: { status: 'CANCELLED' },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      prisma.waitlist.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFromWaitlist(mockWaitlistId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeFromWaitlist(mockWaitlistId, mockTenantId),
      ).rejects.toThrow('Waitlist entry not found');

      expect(prisma.waitlist.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenantId does not match', async () => {
      prisma.waitlist.findUnique.mockResolvedValue({
        ...mockWaitlistEntry,
        tenantId: 'other-tenant',
      });

      await expect(
        service.removeFromWaitlist(mockWaitlistId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeFromWaitlist(mockWaitlistId, mockTenantId),
      ).rejects.toThrow('Waitlist entry not found');

      expect(prisma.waitlist.update).not.toHaveBeenCalled();
    });
  });
});
