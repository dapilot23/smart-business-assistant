import { Test, TestingModule } from '@nestjs/testing';
import { WeeklyReportService } from './weekly-report.service';
import { CopilotToolsService } from './copilot-tools.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';

describe('WeeklyReportService', () => {
  let service: WeeklyReportService;
  let prisma: MockPrismaService;
  let mockAiEngine: {
    generateText: jest.Mock;
    isReady: jest.Mock;
  };
  let mockToolsService: {
    executeTool: jest.Mock;
  };

  const mockTenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    mockAiEngine = {
      generateText: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    };
    mockToolsService = {
      executeTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyReportService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiEngineService, useValue: mockAiEngine },
        { provide: CopilotToolsService, useValue: mockToolsService },
      ],
    }).compile();

    service = module.get<WeeklyReportService>(WeeklyReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReportForTenant', () => {
    beforeEach(() => {
      mockToolsService.executeTool
        .mockResolvedValueOnce({ total: 5000, breakdown: [] })
        .mockResolvedValueOnce({ total: 25, completed: 20, completionRate: 80 })
        .mockResolvedValueOnce({ conversionRate: 45 })
        .mockResolvedValueOnce({ totalCustomers: 100, atRiskCount: 5 })
        .mockResolvedValueOnce({ npsScore: 65 });

      prisma.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Test Business',
      });
    });

    it('should generate report with key metrics', async () => {
      mockAiEngine.generateText.mockResolvedValue({
        data: JSON.stringify({
          topWins: ['Revenue up 10% from last week'],
          areasNeedingAttention: ['5 at-risk customers need follow-up'],
          actionItems: ['Call top 3 at-risk customers'],
          forecast: 'Expected steady growth next week',
        }),
        inputTokens: 200,
        outputTokens: 100,
        latencyMs: 500,
        cached: false,
      });
      prisma.weeklyReport.create.mockResolvedValue({
        id: 'report-1',
        tenantId: mockTenantId,
        weekStart: new Date(),
        report: {},
      });

      const result = await service.generateReportForTenant(mockTenantId);

      expect(result.report).toHaveProperty('keyMetrics');
      expect(result.report.keyMetrics.revenue).toBe(5000);
    });

    it('should identify wins and concerns', async () => {
      mockAiEngine.generateText.mockResolvedValue({
        data: JSON.stringify({
          topWins: ['Best revenue week this month', 'High appointment completion'],
          areasNeedingAttention: ['Quote conversion below target'],
          actionItems: ['Review pricing strategy'],
          forecast: 'Focus on quote follow-ups',
        }),
        inputTokens: 200,
        outputTokens: 100,
        latencyMs: 500,
        cached: false,
      });
      prisma.weeklyReport.create.mockResolvedValue({
        id: 'report-1',
        tenantId: mockTenantId,
        weekStart: new Date(),
        report: {},
      });

      const result = await service.generateReportForTenant(mockTenantId);

      expect(result.report.topWins).toHaveLength(2);
      expect(result.report.areasNeedingAttention).toHaveLength(1);
    });

    it('should provide actionable items', async () => {
      mockAiEngine.generateText.mockResolvedValue({
        data: JSON.stringify({
          topWins: ['Good week overall'],
          areasNeedingAttention: ['Some concerns'],
          actionItems: [
            'Follow up with at-risk customers',
            'Review pending quotes',
            'Schedule team meeting',
          ],
          forecast: 'Positive outlook',
        }),
        inputTokens: 200,
        outputTokens: 100,
        latencyMs: 500,
        cached: false,
      });
      prisma.weeklyReport.create.mockResolvedValue({
        id: 'report-1',
        tenantId: mockTenantId,
        weekStart: new Date(),
        report: {},
      });

      const result = await service.generateReportForTenant(mockTenantId);

      expect(result.report.actionItems).toHaveLength(3);
      expect(result.report.actionItems[0]).toContain('Follow up');
    });

    it('should store report in database', async () => {
      mockAiEngine.generateText.mockResolvedValue({
        data: JSON.stringify({
          topWins: [],
          areasNeedingAttention: [],
          actionItems: [],
          forecast: 'Test',
        }),
        inputTokens: 200,
        outputTokens: 100,
        latencyMs: 500,
        cached: false,
      });
      prisma.weeklyReport.create.mockResolvedValue({
        id: 'report-new',
        tenantId: mockTenantId,
        weekStart: new Date(),
        report: {},
      });

      await service.generateReportForTenant(mockTenantId);

      expect(prisma.weeklyReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          report: expect.any(Object),
        }),
      });
    });
  });

  describe('getLatestReport', () => {
    it('should return most recent report', async () => {
      const report = {
        id: 'report-latest',
        tenantId: mockTenantId,
        weekStart: new Date(),
        report: { keyMetrics: { revenue: 5000 } },
        createdAt: new Date(),
      };
      prisma.weeklyReport.findFirst.mockResolvedValue(report);

      const result = await service.getLatestReport(mockTenantId);

      expect(result).toEqual(report);
      expect(prisma.weeklyReport.findFirst).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { weekStart: 'desc' },
      });
    });
  });

  describe('listReports', () => {
    it('should return historical reports', async () => {
      const reports = [
        { id: 'report-1', weekStart: new Date('2024-01-15') },
        { id: 'report-2', weekStart: new Date('2024-01-08') },
        { id: 'report-3', weekStart: new Date('2024-01-01') },
      ];
      prisma.weeklyReport.findMany.mockResolvedValue(reports);

      const result = await service.listReports(mockTenantId, 10);

      expect(result).toHaveLength(3);
      expect(prisma.weeklyReport.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { weekStart: 'desc' },
        take: 10,
      });
    });
  });
});
