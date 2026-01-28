import { Test, TestingModule } from '@nestjs/testing';
import { ReputationAnalyticsService } from './reputation-analytics.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('ReputationAnalyticsService', () => {
  let service: ReputationAnalyticsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const mockTenantId = 'tenant-123';

  const mockRecentRequest = {
    id: 'req-1',
    status: 'CLICKED',
    platform: 'GOOGLE',
    npsGated: true,
    npsScore: 9,
    sentAt: new Date('2025-01-10'),
    clickedAt: new Date('2025-01-11'),
    createdAt: new Date('2025-01-09'),
    customer: { id: 'cust-1', name: 'John Doe' },
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReputationAnalyticsService>(
      ReputationAnalyticsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReputationDashboard', () => {
    it('should return combined stats with correct counts and click rates', async () => {
      // Promise.all interleaves getOverallStats and getNpsGatedStats,
      // so use mockImplementation to return values based on arguments
      prisma.reviewRequest.count.mockImplementation((args: any) => {
        const w = args.where;
        if (w.npsGated && w.status?.in) return Promise.resolve(5); // npsGated sent
        if (w.npsGated && w.status === 'CLICKED') return Promise.resolve(2); // npsGated clicked
        if (w.status?.in) return Promise.resolve(7); // overall sent
        if (w.status === 'CLICKED') return Promise.resolve(3); // overall clicked
        return Promise.resolve(10); // totalRequests
      });

      // getPlatformBreakdown and getRecentRequests findMany
      prisma.reviewRequest.findMany.mockImplementation((args: any) => {
        if (args.take) {
          // getRecentRequests has take: 20
          return Promise.resolve([mockRecentRequest]);
        }
        // getPlatformBreakdown (select: { platform: true } only)
        return Promise.resolve([
          { platform: 'GOOGLE' },
          { platform: 'GOOGLE' },
          { platform: 'YELP' },
        ]);
      });

      const result = await service.getReputationDashboard(mockTenantId);

      // Overall stats: clickRate = round((3/7)*1000)/10 = 42.9
      expect(result.totalRequests).toBe(10);
      expect(result.sentCount).toBe(7);
      expect(result.clickedCount).toBe(3);
      expect(result.clickRate).toBe(42.9);

      // NPS gated stats: conversionRate = round((2/5)*1000)/10 = 40
      expect(result.npsGatedStats).toEqual({
        sent: 5,
        clicked: 2,
        conversionRate: 40,
      });

      // Platform breakdown
      expect(result.platformBreakdown).toEqual(
        expect.arrayContaining([
          { platform: 'GOOGLE', clickCount: 2 },
          { platform: 'YELP', clickCount: 1 },
        ]),
      );

      // Recent requests
      expect(result.recentRequests).toEqual([mockRecentRequest]);

      // Verify count was called 5 times total
      expect(prisma.reviewRequest.count).toHaveBeenCalledTimes(5);

      // Verify findMany was called 2 times (platformBreakdown + recentRequests)
      expect(prisma.reviewRequest.findMany).toHaveBeenCalledTimes(2);
    });

    it('should handle empty state with no requests', async () => {
      prisma.reviewRequest.count.mockResolvedValue(0);
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getReputationDashboard(mockTenantId);

      expect(result.totalRequests).toBe(0);
      expect(result.sentCount).toBe(0);
      expect(result.clickedCount).toBe(0);
      expect(result.clickRate).toBe(0);

      expect(result.npsGatedStats).toEqual({
        sent: 0,
        clicked: 0,
        conversionRate: 0,
      });

      expect(result.platformBreakdown).toEqual([]);
      expect(result.recentRequests).toEqual([]);
    });

    it('should pass correct where clauses to prisma count calls', async () => {
      prisma.reviewRequest.count.mockResolvedValue(0);
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      await service.getReputationDashboard(mockTenantId);

      // Verify all 5 count calls were made with correct where clauses
      // (order is non-deterministic due to Promise.all interleaving)
      expect(prisma.reviewRequest.count).toHaveBeenCalledTimes(5);

      expect(prisma.reviewRequest.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
      expect(prisma.reviewRequest.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, status: { in: ['SENT', 'CLICKED'] } },
      });
      expect(prisma.reviewRequest.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, status: 'CLICKED' },
      });
      expect(prisma.reviewRequest.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          npsGated: true,
          status: { in: ['SENT', 'CLICKED'] },
        },
      });
      expect(prisma.reviewRequest.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          npsGated: true,
          status: 'CLICKED',
        },
      });
    });

    it('should pass correct arguments to recentRequests findMany', async () => {
      prisma.reviewRequest.count.mockResolvedValue(0);
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      await service.getReputationDashboard(mockTenantId);

      // Verify getRecentRequests call (order non-deterministic due to Promise.all)
      expect(prisma.reviewRequest.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: {
          id: true,
          status: true,
          platform: true,
          npsGated: true,
          npsScore: true,
          sentAt: true,
          clickedAt: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });
  });

  describe('getPlatformBreakdown', () => {
    it('should return correct platform counts', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([
        { platform: 'GOOGLE' },
        { platform: 'GOOGLE' },
        { platform: 'GOOGLE' },
        { platform: 'YELP' },
        { platform: 'FACEBOOK' },
        { platform: 'FACEBOOK' },
      ]);

      const result = await service.getPlatformBreakdown(mockTenantId);

      expect(result).toEqual(
        expect.arrayContaining([
          { platform: 'GOOGLE', clickCount: 3 },
          { platform: 'YELP', clickCount: 1 },
          { platform: 'FACEBOOK', clickCount: 2 },
        ]),
      );
      expect(result).toHaveLength(3);
    });

    it('should query with correct where clause', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      await service.getPlatformBreakdown(mockTenantId);

      expect(prisma.reviewRequest.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: 'CLICKED',
          platform: { not: null },
        },
        select: { platform: true },
      });
    });

    it('should handle empty state', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getPlatformBreakdown(mockTenantId);

      expect(result).toEqual([]);
      expect(prisma.reviewRequest.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle single platform', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([
        { platform: 'GOOGLE' },
      ]);

      const result = await service.getPlatformBreakdown(mockTenantId);

      expect(result).toEqual([{ platform: 'GOOGLE', clickCount: 1 }]);
    });

    it('should label null platforms as unknown', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([
        { platform: null },
        { platform: null },
      ]);

      const result = await service.getPlatformBreakdown(mockTenantId);

      expect(result).toEqual([{ platform: 'unknown', clickCount: 2 }]);
    });
  });

  describe('getWeeklyVelocity', () => {
    it('should return weekly data with correct grouping', async () => {
      const now = new Date();
      const daysAgo = (d: number) => {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        date.setHours(12, 0, 0, 0);
        return date;
      };

      // Items clicked 1 day ago and 3 days ago (same week bucket)
      // Item clicked 10 days ago (different week bucket)
      prisma.reviewRequest.findMany.mockResolvedValue([
        { clickedAt: daysAgo(10) },
        { clickedAt: daysAgo(3) },
        { clickedAt: daysAgo(1) },
      ]);

      const result = await service.getWeeklyVelocity(mockTenantId, 4);

      expect(result).toHaveLength(4);

      // Each entry should have weekStart (YYYY-MM-DD) and count
      result.forEach((entry) => {
        expect(entry).toHaveProperty('weekStart');
        expect(entry).toHaveProperty('count');
        expect(entry.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof entry.count).toBe('number');
      });

      // Total clicks across all weeks should equal number of items
      const totalClicks = result.reduce((sum, w) => sum + w.count, 0);
      expect(totalClicks).toBe(3);
    });

    it('should pass correct query parameters', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      await service.getWeeklyVelocity(mockTenantId, 4);

      expect(prisma.reviewRequest.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: 'CLICKED',
          clickedAt: { gte: expect.any(Date) },
        },
        select: { clickedAt: true },
        orderBy: { clickedAt: 'asc' },
      });
    });

    it('should calculate the since date correctly', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([]);
      const weeks = 4;
      const beforeCall = new Date();

      await service.getWeeklyVelocity(mockTenantId, weeks);

      const callArgs = prisma.reviewRequest.findMany.mock.calls[0][0];
      const sinceDate: Date = callArgs.where.clickedAt.gte;

      // sinceDate should be approximately 28 days ago
      const expectedMs = beforeCall.getTime() - weeks * 7 * 24 * 60 * 60 * 1000;
      const diffMs = Math.abs(sinceDate.getTime() - expectedMs);
      // Allow 1 second tolerance for test execution time
      expect(diffMs).toBeLessThan(1000);
    });

    it('should return correct number of weeks', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result2 = await service.getWeeklyVelocity(mockTenantId, 2);
      expect(result2).toHaveLength(2);

      prisma.reviewRequest.findMany.mockResolvedValue([]);
      const result8 = await service.getWeeklyVelocity(mockTenantId, 8);
      expect(result8).toHaveLength(8);
    });

    it('should return all zeros when no clicked items exist', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getWeeklyVelocity(mockTenantId, 4);

      expect(result).toHaveLength(4);
      result.forEach((entry) => {
        expect(entry.count).toBe(0);
      });
    });

    it('should order weeks from oldest to newest', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([]);

      const result = await service.getWeeklyVelocity(mockTenantId, 4);

      for (let i = 1; i < result.length; i++) {
        const prev = new Date(result[i - 1].weekStart);
        const curr = new Date(result[i].weekStart);
        expect(curr.getTime()).toBeGreaterThan(prev.getTime());
      }
    });

    it('should ignore items with null clickedAt', async () => {
      prisma.reviewRequest.findMany.mockResolvedValue([
        { clickedAt: null },
        { clickedAt: null },
      ]);

      const result = await service.getWeeklyVelocity(mockTenantId, 4);

      const totalClicks = result.reduce((sum, w) => sum + w.count, 0);
      expect(totalClicks).toBe(0);
    });
  });
});
