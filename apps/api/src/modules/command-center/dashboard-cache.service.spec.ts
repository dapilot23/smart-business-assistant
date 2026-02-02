import { Test, TestingModule } from '@nestjs/testing';
import { DashboardCacheService } from './dashboard-cache.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CacheService } from '../../config/cache/cache.service';
import { TaskLedgerService } from '../task-ledger/task-ledger.service';
import { createMockPrismaService } from '../../test/prisma-mock';
import { SignalType } from './types';

describe('DashboardCacheService', () => {
  let service: DashboardCacheService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let cacheService: { wrap: jest.Mock; del: jest.Mock };
  let taskLedgerService: { getTaskStats: jest.Mock };

  const mockTenantId = 'tenant-123';

  const mockTaskStats = {
    pending: 5,
    approvals: 3,
    completedToday: 10,
    failedToday: 1,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    cacheService = {
      wrap: jest.fn(),
      del: jest.fn().mockResolvedValue(undefined),
    };
    taskLedgerService = {
      getTaskStats: jest.fn().mockResolvedValue(mockTaskStats),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardCacheService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
        { provide: TaskLedgerService, useValue: taskLedgerService },
      ],
    }).compile();

    service = module.get<DashboardCacheService>(DashboardCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should return cached data via cache.wrap', async () => {
      const mockDashboardData = {
        statusBar: {
          greeting: 'Good morning',
          todayAppointments: 5,
          outstandingAmount: 1500,
          businessPulseScore: 75,
          trend: 'stable' as const,
        },
        taskStats: mockTaskStats,
        signals: [],
        metrics: {
          todayRevenue: 500,
          todayRevenueTarget: 1000,
          weekAppointments: 20,
          weekRevenue: 3000,
          overdueInvoicesCount: 2,
          overdueInvoicesAmount: 800,
          unconfirmedAppointments: 3,
          pendingQuotesCount: 4,
          pendingQuotesAmount: 2000,
        },
        cachedAt: new Date(),
      };

      cacheService.wrap.mockResolvedValue(mockDashboardData);

      const result = await service.getDashboardData(mockTenantId);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
        expect.any(Function),
        30000, // 30 seconds in milliseconds
      );
      expect(result).toEqual(mockDashboardData);
    });

    it('should calculate fresh data when cache misses', async () => {
      // Mock cache.wrap to execute the calculation function
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      // Mock Prisma queries for status bar
      prisma.appointment.count.mockResolvedValue(5);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 1500 } },
        _count: 2,
      });
      prisma.quote.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 2000 } },
        _count: 4,
      });

      // Mock for signals - empty results
      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.quote.findMany.mockResolvedValue([]);
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getDashboardData(mockTenantId);

      expect(result).toBeDefined();
      expect(result.statusBar).toBeDefined();
      expect(result.taskStats).toEqual(mockTaskStats);
      expect(result.cachedAt).toBeInstanceOf(Date);
    });
  });

  describe('refreshDashboardData', () => {
    it('should invalidate cache and return fresh data', async () => {
      const freshData = {
        statusBar: {
          greeting: 'Good afternoon',
          todayAppointments: 7,
          outstandingAmount: 2000,
          businessPulseScore: 80,
          trend: 'up' as const,
        },
        taskStats: mockTaskStats,
        signals: [],
        metrics: {
          todayRevenue: 800,
          todayRevenueTarget: 1000,
          weekAppointments: 25,
          weekRevenue: 4000,
          overdueInvoicesCount: 1,
          overdueInvoicesAmount: 500,
          unconfirmedAppointments: 2,
          pendingQuotesCount: 3,
          pendingQuotesAmount: 1500,
        },
        cachedAt: new Date(),
      };

      cacheService.wrap.mockResolvedValue(freshData);

      const result = await service.refreshDashboardData(mockTenantId);

      expect(cacheService.del).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
      );
      expect(cacheService.wrap).toHaveBeenCalled();
      expect(result).toEqual(freshData);
    });
  });

  describe('invalidate', () => {
    it('should delete the cache key for tenant', async () => {
      await service.invalidate(mockTenantId);

      expect(cacheService.del).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
      );
    });
  });

  describe('calculateSignals', () => {
    it('should generate unconfirmed appointments signal', async () => {
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      // Setup basic mocks
      prisma.appointment.count.mockResolvedValue(5);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 0 } },
        _count: 0,
      });
      prisma.quote.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 0 } },
        _count: 0,
      });

      // Unconfirmed appointments signal
      const mockUnconfirmedAppts = [
        {
          id: 'appt-1',
          tenantId: mockTenantId,
          status: 'SCHEDULED',
          confirmedAt: null,
          scheduledAt: new Date(),
          customer: { id: 'cust-1', name: 'John Doe' },
        },
        {
          id: 'appt-2',
          tenantId: mockTenantId,
          status: 'SCHEDULED',
          confirmedAt: null,
          scheduledAt: new Date(),
          customer: { id: 'cust-2', name: 'Jane Doe' },
        },
      ];
      prisma.appointment.findMany.mockResolvedValue(mockUnconfirmedAppts);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.quote.findMany.mockResolvedValue([]);
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getDashboardData(mockTenantId);

      expect(result.signals.length).toBeGreaterThan(0);
      const unconfirmedSignal = result.signals.find((s) =>
        s.title.includes('Unconfirmed'),
      );
      expect(unconfirmedSignal).toBeDefined();
      expect(unconfirmedSignal?.type).toBe(SignalType.WARNING);
      expect(unconfirmedSignal?.count).toBe(2);
      expect(unconfirmedSignal?.action).toBeDefined();
    });

    it('should generate overdue invoices signal', async () => {
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      prisma.appointment.count.mockResolvedValue(0);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 500 } },
        _count: 2,
      });
      prisma.quote.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 0 } },
        _count: 0,
      });

      prisma.appointment.findMany.mockResolvedValue([]);
      const mockOverdueInvoices = [
        {
          id: 'inv-1',
          tenantId: mockTenantId,
          status: 'OVERDUE',
          amount: { toNumber: () => 300 },
          dueDate: new Date('2024-01-01'),
          customer: { id: 'cust-1', name: 'John Doe' },
        },
        {
          id: 'inv-2',
          tenantId: mockTenantId,
          status: 'OVERDUE',
          amount: { toNumber: () => 200 },
          dueDate: new Date('2024-01-02'),
          customer: { id: 'cust-2', name: 'Jane Doe' },
        },
      ];
      prisma.invoice.findMany.mockResolvedValue(mockOverdueInvoices);
      prisma.quote.findMany.mockResolvedValue([]);
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getDashboardData(mockTenantId);

      const overdueSignal = result.signals.find((s) =>
        s.title.includes('Overdue'),
      );
      expect(overdueSignal).toBeDefined();
      expect(overdueSignal?.type).toBe(SignalType.WARNING);
      expect(overdueSignal?.amount).toBe(500);
    });

    it('should generate stale quotes signal', async () => {
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      prisma.appointment.count.mockResolvedValue(0);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 0 } },
        _count: 0,
      });
      prisma.quote.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 1000 } },
        _count: 2,
      });

      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([]);
      const mockStaleQuotes = [
        {
          id: 'quote-1',
          tenantId: mockTenantId,
          status: 'SENT',
          amount: { toNumber: () => 600 },
          createdAt: new Date('2024-01-01'),
          customer: { id: 'cust-1', name: 'John Doe' },
        },
        {
          id: 'quote-2',
          tenantId: mockTenantId,
          status: 'SENT',
          amount: { toNumber: () => 400 },
          createdAt: new Date('2024-01-02'),
          customer: { id: 'cust-2', name: 'Jane Doe' },
        },
      ];
      prisma.quote.findMany.mockResolvedValue(mockStaleQuotes);
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getDashboardData(mockTenantId);

      const quotesSignal = result.signals.find((s) =>
        s.title.includes('Quotes'),
      );
      expect(quotesSignal).toBeDefined();
      expect(quotesSignal?.type).toBe(SignalType.OPPORTUNITY);
      expect(quotesSignal?.amount).toBe(1000);
    });

    it('should generate recent reviews signal', async () => {
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      prisma.appointment.count.mockResolvedValue(0);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 0 } },
        _count: 0,
      });
      prisma.quote.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 0 } },
        _count: 0,
      });

      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.quote.findMany.mockResolvedValue([]);
      const mockRecentReviews = [
        { id: 'review-1', tenantId: mockTenantId, status: 'CLICKED' },
        { id: 'review-2', tenantId: mockTenantId, status: 'CLICKED' },
      ];
      prisma.reviewRequest.findMany.mockResolvedValue(mockRecentReviews);

      const result = await service.getDashboardData(mockTenantId);

      const reviewSignal = result.signals.find((s) =>
        s.title.includes('review'),
      );
      expect(reviewSignal).toBeDefined();
      expect(reviewSignal?.type).toBe(SignalType.SUCCESS);
      expect(reviewSignal?.count).toBe(2);
    });

    it('should sort signals by priority', async () => {
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      prisma.appointment.count.mockResolvedValue(3);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 500 } },
        _count: 2,
      });
      prisma.quote.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 1000 } },
        _count: 3,
      });

      // All signal types present
      prisma.appointment.findMany.mockResolvedValue([
        { id: 'appt-1', customer: { name: 'Test' } },
      ]);
      prisma.invoice.findMany.mockResolvedValue([
        { id: 'inv-1', amount: { toNumber: () => 500 }, customer: { name: 'Test' } },
      ]);
      prisma.quote.findMany.mockResolvedValue([
        { id: 'quote-1', amount: { toNumber: () => 1000 }, customer: { name: 'Test' } },
      ]);
      prisma.reviewRequest.findMany.mockResolvedValue([
        { id: 'review-1', status: 'CLICKED' },
      ]);

      const result = await service.getDashboardData(mockTenantId);

      // High priority signals should come first
      expect(result.signals.length).toBe(4);
      expect(result.signals[0].priority).toBe('high');
      expect(result.signals[result.signals.length - 1].priority).toBe('low');
    });
  });

  describe('event handlers', () => {
    it('should invalidate cache on appointment event', async () => {
      await service.onAppointmentEvent({ tenantId: mockTenantId });

      expect(cacheService.del).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
      );
    });

    it('should invalidate cache on invoice event', async () => {
      await service.onInvoiceEvent({ tenantId: mockTenantId });

      expect(cacheService.del).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
      );
    });

    it('should invalidate cache on quote event', async () => {
      await service.onQuoteEvent({ tenantId: mockTenantId });

      expect(cacheService.del).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
      );
    });

    it('should invalidate cache on task ledger event', async () => {
      await service.onTaskLedgerEvent({ tenantId: mockTenantId });

      expect(cacheService.del).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
      );
    });

    it('should invalidate cache on payment event', async () => {
      await service.onPaymentEvent({ tenantId: mockTenantId });

      expect(cacheService.del).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
      );
    });

    it('should invalidate cache on review event', async () => {
      await service.onReviewEvent({ tenantId: mockTenantId });

      expect(cacheService.del).toHaveBeenCalledWith(
        `dashboard:${mockTenantId}:main`,
      );
    });

    it('should not invalidate cache when tenantId is missing', async () => {
      await service.onAppointmentEvent({ tenantId: '' });

      expect(cacheService.del).not.toHaveBeenCalled();
    });
  });

  describe('getGreeting', () => {
    it('should return appropriate greeting based on time', async () => {
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      prisma.appointment.count.mockResolvedValue(0);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: 0,
      });
      prisma.quote.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: 0,
      });
      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.quote.findMany.mockResolvedValue([]);
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getDashboardData(mockTenantId);

      // Greeting should be one of the three options
      expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(
        result.statusBar.greeting,
      );
    });
  });
});
