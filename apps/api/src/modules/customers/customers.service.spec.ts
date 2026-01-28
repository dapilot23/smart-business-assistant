import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return customers for the given tenant', async () => {
      const mockCustomers = [mockCustomer];
      prisma.customer.findMany.mockResolvedValue(mockCustomers);

      const result = await service.findAll(mockTenantId);

      expect(result).toEqual(mockCustomers);
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no customers exist', async () => {
      prisma.customer.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockTenantId);

      expect(result).toEqual([]);
      expect(prisma.customer.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return customer when id AND tenantId match', async () => {
      const mockCustomerWithRelations = {
        ...mockCustomer,
        appointments: [],
        quotes: [],
        invoices: [],
      };
      prisma.customer.findFirst.mockResolvedValue(mockCustomerWithRelations);

      const result = await service.findOne(mockCustomerId, mockTenantId);

      expect(result).toEqual(mockCustomerWithRelations);
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
        include: {
          appointments: true,
          quotes: true,
          invoices: true,
        },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockCustomerId, mockTenantId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.customer.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when tenantId does not match', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockCustomerId, 'wrong-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create customer with correct tenantId', async () => {
      const createData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1987654321',
        address: '456 Oak Ave',
      };

      const expectedCustomer = {
        id: 'new-customer-id',
        ...createData,
        tenantId: mockTenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.customer.create.mockResolvedValue(expectedCustomer);

      const result = await service.create(createData, mockTenantId);

      expect(result).toEqual(expectedCustomer);
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          tenantId: mockTenantId,
        },
      });
    });

    it('should include tenantId even if not provided in data', async () => {
      const createData = { name: 'Test Customer', phone: '+1111111111' };
      prisma.customer.create.mockResolvedValue({ id: 'new-id', ...createData, tenantId: mockTenantId });

      await service.create(createData, mockTenantId);

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
        }),
      });
    });
  });

  describe('update', () => {
    it('should update customer after tenant validation', async () => {
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };
      const mockCustomerWithRelations = {
        ...mockCustomer,
        appointments: [],
        quotes: [],
        invoices: [],
      };
      const updatedCustomer = { ...mockCustomerWithRelations, ...updateData };

      prisma.customer.findFirst.mockResolvedValue(mockCustomerWithRelations);
      prisma.customer.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(mockCustomerId, updateData, mockTenantId);

      expect(result).toEqual(updatedCustomer);
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
        include: {
          appointments: true,
          quotes: true,
          invoices: true,
        },
      });
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: updateData,
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockCustomerId, { name: 'New Name' }, mockTenantId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.customer.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockCustomerId, { name: 'New Name' }, 'wrong-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete customer after tenant validation', async () => {
      const mockCustomerWithRelations = {
        ...mockCustomer,
        appointments: [],
        quotes: [],
        invoices: [],
      };

      prisma.customer.findFirst.mockResolvedValue(mockCustomerWithRelations);
      prisma.customer.delete.mockResolvedValue(mockCustomer);

      const result = await service.remove(mockCustomerId, mockTenantId);

      expect(result).toEqual(mockCustomer);
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
        include: {
          appointments: true,
          quotes: true,
          invoices: true,
        },
      });
      expect(prisma.customer.delete).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockCustomerId, mockTenantId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.customer.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockCustomerId, 'wrong-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
