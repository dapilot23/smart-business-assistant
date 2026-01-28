import { Test, TestingModule } from '@nestjs/testing';
import { AiCostTrackerService } from './ai-cost-tracker.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';

describe('AiCostTrackerService', () => {
  let service: AiCostTrackerService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCostTrackerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AiCostTrackerService>(AiCostTrackerService);
  });

  describe('calculateCostCents', () => {
    it('should calculate correct cost for typical token counts', () => {
      // 1000 input tokens = $0.003 = 0.3 cents → rounds up to 1
      // 500 output tokens = $0.0075 = 0.75 cents → total 1.05 → 2 cents
      const cost = service.calculateCostCents(1000, 500);
      expect(cost).toBe(2);
    });

    it('should handle large token counts', () => {
      // 100k input = $0.30 = 30 cents
      // 10k output = $0.15 = 15 cents → total 45 cents
      const cost = service.calculateCostCents(100_000, 10_000);
      expect(cost).toBe(45);
    });

    it('should return 0 for zero tokens', () => {
      const cost = service.calculateCostCents(0, 0);
      expect(cost).toBe(0);
    });

    it('should round up fractional cents', () => {
      // 1 input token = 0.0003 cents, 1 output = 0.0015 cents → 0.0018 → 1 cent
      const cost = service.calculateCostCents(1, 1);
      expect(cost).toBe(1);
    });
  });

  describe('recordUsage', () => {
    it('should create AiUsageLog record with calculated cost', async () => {
      prisma.aiUsageLog.create.mockResolvedValue({});

      await service.recordUsage({
        tenantId: 'tenant-1',
        feature: 'quote-scoring',
        template: 'quote.score-conversion',
        inputTokens: 500,
        outputTokens: 200,
        latencyMs: 1200,
        success: true,
      });

      expect(prisma.aiUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          feature: 'quote-scoring',
          template: 'quote.score-conversion',
          inputTokens: 500,
          outputTokens: 200,
          latencyMs: 1200,
          success: true,
          costCents: expect.any(Number),
        }),
      });
    });

    it('should record error message on failure', async () => {
      prisma.aiUsageLog.create.mockResolvedValue({});

      await service.recordUsage({
        tenantId: 'tenant-1',
        feature: 'quote-scoring',
        template: 'quote.score-conversion',
        inputTokens: 100,
        outputTokens: 0,
        latencyMs: 5000,
        success: false,
        errorMessage: 'Rate limit exceeded',
      });

      expect(prisma.aiUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          errorMessage: 'Rate limit exceeded',
        }),
      });
    });

    it('should not throw on database error', async () => {
      prisma.aiUsageLog.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.recordUsage({
          tenantId: 'tenant-1',
          feature: 'test',
          template: 'test',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          success: true,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('getTenantCost', () => {
    it('should aggregate costs by feature for date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _sum: { costCents: 1500 },
        _count: { id: 25 },
      });
      prisma.aiUsageLog.groupBy.mockResolvedValue([
        { feature: 'quote-scoring', _sum: { costCents: 1000 }, _count: { id: 15 } },
        { feature: 'photo-quotes', _sum: { costCents: 500 }, _count: { id: 10 } },
      ]);

      const result = await service.getTenantCost('tenant-1', startDate, endDate);

      expect(result.totalCostCents).toBe(1500);
      expect(result.totalCalls).toBe(25);
      expect(result.byFeature).toHaveLength(2);
      expect(result.byFeature[0].feature).toBe('quote-scoring');
    });

    it('should return zero for tenant with no usage', async () => {
      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _sum: { costCents: null },
        _count: { id: 0 },
      });
      prisma.aiUsageLog.groupBy.mockResolvedValue([]);

      const result = await service.getTenantCost(
        'tenant-1',
        new Date(),
        new Date(),
      );

      expect(result.totalCostCents).toBe(0);
      expect(result.totalCalls).toBe(0);
      expect(result.byFeature).toHaveLength(0);
    });
  });

  describe('getFeatureUsage', () => {
    it('should return usage summary with success rate', async () => {
      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _count: { id: 20 },
        _sum: { costCents: 800 },
        _avg: { latencyMs: 1500 },
      });
      prisma.aiUsageLog.count.mockResolvedValue(18);

      const result = await service.getFeatureUsage('tenant-1', 'quote-scoring');

      expect(result.totalCalls).toBe(20);
      expect(result.totalCostCents).toBe(800);
      expect(result.avgLatencyMs).toBe(1500);
      expect(result.successRate).toBe(0.9);
    });

    it('should handle zero calls gracefully', async () => {
      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _count: { id: 0 },
        _sum: { costCents: null },
        _avg: { latencyMs: null },
      });
      prisma.aiUsageLog.count.mockResolvedValue(0);

      const result = await service.getFeatureUsage('tenant-1', 'quote-scoring');

      expect(result.totalCalls).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.avgLatencyMs).toBe(0);
      expect(result.totalCostCents).toBe(0);
    });
  });
});
