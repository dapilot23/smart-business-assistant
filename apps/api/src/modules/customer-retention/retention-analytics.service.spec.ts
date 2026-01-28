import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';
import { RetentionAnalyticsService } from './retention-analytics.service';

describe('RetentionAnalyticsService', () => {
  let service: RetentionAnalyticsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';

  const makeCustomer = (overrides: Record<string, any> = {}) => ({
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'Jane Doe',
    email: 'jane@example.com',
    lifecycleStage: 'ACTIVE',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
    invoices: [],
    ...overrides,
  });

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RetentionAnalyticsService>(
      RetentionAnalyticsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('calculateCLV', () => {
    it('should calculate CLV correctly with paid invoices', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01'));

      const customer = makeCustomer({
        invoices: [
          { amount: '250.00', status: 'PAID' },
          { amount: '150.00', status: 'PAID' },
          { amount: '100.00', status: 'PAID' },
        ],
      });
      prisma.customer.findFirst.mockResolvedValue(customer);

      const result = await service.calculateCLV(
        mockCustomerId,
        mockTenantId,
      );

      expect(result.customerId).toBe(mockCustomerId);
      expect(result.customerName).toBe('Jane Doe');
      expect(result.totalSpent).toBe(500);
      expect(result.visitCount).toBe(3);
      expect(result.averageTicket).toBeCloseTo(166.67, 1);
      expect(result.tenureMonths).toBe(12);
      expect(result.annualizedCLV).toBe(500);

      jest.useRealTimers();
    });

    it('should return 0 CLV for customer with no invoices', async () => {
      const customer = makeCustomer({ invoices: [] });
      prisma.customer.findFirst.mockResolvedValue(customer);

      const result = await service.calculateCLV(
        mockCustomerId,
        mockTenantId,
      );

      expect(result.totalSpent).toBe(0);
      expect(result.visitCount).toBe(0);
      expect(result.averageTicket).toBe(0);
      expect(result.annualizedCLV).toBe(0);
    });

    it('should calculate annualized CLV based on tenure', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-07-01'));

      const customer = makeCustomer({
        createdAt: new Date('2025-01-01'),
        invoices: [
          { amount: '300.00', status: 'PAID' },
          { amount: '300.00', status: 'PAID' },
        ],
      });
      prisma.customer.findFirst.mockResolvedValue(customer);

      const result = await service.calculateCLV(
        mockCustomerId,
        mockTenantId,
      );

      expect(result.tenureMonths).toBe(6);
      expect(result.annualizedCLV).toBe(1200);

      jest.useRealTimers();
    });

    it('should throw NotFoundException if customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateCLV(mockCustomerId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTopCustomers', () => {
    it('should return customers sorted by annualized CLV descending', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01'));

      const customers = [
        makeCustomer({
          id: 'c1',
          name: 'Low Spender',
          invoices: [{ amount: '50.00', status: 'PAID' }],
        }),
        makeCustomer({
          id: 'c2',
          name: 'High Spender',
          invoices: [
            { amount: '500.00', status: 'PAID' },
            { amount: '500.00', status: 'PAID' },
          ],
        }),
        makeCustomer({
          id: 'c3',
          name: 'Mid Spender',
          invoices: [{ amount: '300.00', status: 'PAID' }],
        }),
      ];
      prisma.customer.findMany.mockResolvedValue(customers);

      const result = await service.getTopCustomers(mockTenantId, 10);

      expect(result[0].customerName).toBe('High Spender');
      expect(result[1].customerName).toBe('Mid Spender');
      expect(result[2].customerName).toBe('Low Spender');

      jest.useRealTimers();
    });

    it('should respect the limit parameter', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01'));

      const customers = [
        makeCustomer({
          id: 'c1',
          name: 'A',
          invoices: [{ amount: '100.00', status: 'PAID' }],
        }),
        makeCustomer({
          id: 'c2',
          name: 'B',
          invoices: [{ amount: '200.00', status: 'PAID' }],
        }),
        makeCustomer({
          id: 'c3',
          name: 'C',
          invoices: [{ amount: '300.00', status: 'PAID' }],
        }),
      ];
      prisma.customer.findMany.mockResolvedValue(customers);

      const result = await service.getTopCustomers(mockTenantId, 2);

      expect(result).toHaveLength(2);

      jest.useRealTimers();
    });

    it('should return empty array for tenant with no customers', async () => {
      prisma.customer.findMany.mockResolvedValue([]);

      const result = await service.getTopCustomers(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('getChurnRate', () => {
    it('should calculate churn rate as dormant/total', async () => {
      prisma.customer.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20); // dormant + lost

      const rate = await service.getChurnRate(mockTenantId);

      expect(rate).toBe(0.2);
    });

    it('should return 0 when no customers exist', async () => {
      prisma.customer.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const rate = await service.getChurnRate(mockTenantId);

      expect(rate).toBe(0);
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return complete dashboard metrics', async () => {
      prisma.customer.count
        .mockResolvedValueOnce(100)  // totalCustomers
        .mockResolvedValueOnce(60)   // activeCustomers
        .mockResolvedValueOnce(15)   // dormantCustomers
        .mockResolvedValueOnce(10)   // atRiskCustomers
        .mockResolvedValueOnce(100)  // churnRate total
        .mockResolvedValueOnce(25);  // churnRate dormant

      prisma.retentionCampaign.count
        .mockResolvedValueOnce(50)   // totalSent
        .mockResolvedValueOnce(15)   // winbackSuccess
        .mockResolvedValueOnce(5);   // activeCampaigns

      prisma.customer.findMany.mockResolvedValue([
        makeCustomer({
          id: 'c1',
          invoices: [{ amount: '600.00', status: 'PAID' }],
        }),
        makeCustomer({
          id: 'c2',
          invoices: [{ amount: '400.00', status: 'PAID' }],
        }),
      ]);

      const result = await service.getDashboardMetrics(mockTenantId);

      expect(result.totalCustomers).toBe(100);
      expect(result.activeCustomers).toBe(60);
      expect(result.dormantCustomers).toBe(15);
      expect(result.atRiskCustomers).toBe(10);
      expect(result.churnRate).toBe(0.25);
      expect(result.winbackSuccessRate).toBeCloseTo(0.3, 1);
      expect(result.activeCampaigns).toBe(5);
      expect(result.averageCLV).toBeGreaterThan(0);
    });

    it('should handle empty tenant (all zeros)', async () => {
      prisma.customer.count.mockResolvedValue(0);
      prisma.retentionCampaign.count.mockResolvedValue(0);
      prisma.customer.findMany.mockResolvedValue([]);

      const result = await service.getDashboardMetrics(mockTenantId);

      expect(result.totalCustomers).toBe(0);
      expect(result.activeCustomers).toBe(0);
      expect(result.dormantCustomers).toBe(0);
      expect(result.atRiskCustomers).toBe(0);
      expect(result.churnRate).toBe(0);
      expect(result.winbackSuccessRate).toBe(0);
      expect(result.activeCampaigns).toBe(0);
      expect(result.averageCLV).toBe(0);
    });
  });
});
