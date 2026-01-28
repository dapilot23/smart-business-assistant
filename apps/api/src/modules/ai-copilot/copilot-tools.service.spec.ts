import { Test, TestingModule } from '@nestjs/testing';
import { CopilotToolsService } from './copilot-tools.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';
import { Decimal } from '@prisma/client/runtime/library';

describe('CopilotToolsService', () => {
  let service: CopilotToolsService;
  let prisma: MockPrismaService;

  const mockTenantId = 'tenant-123';
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotToolsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CopilotToolsService>(CopilotToolsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getToolDefinitions', () => {
    it('should return all tool definitions', () => {
      const tools = service.getToolDefinitions();

      expect(tools).toHaveLength(10);
      expect(tools.map((t) => t.name)).toContain('get_revenue_summary');
      expect(tools.map((t) => t.name)).toContain('get_appointment_stats');
      expect(tools.map((t) => t.name)).toContain('get_customer_list');
    });
  });

  describe('get_revenue_summary', () => {
    it('should return revenue grouped by day', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        { paidAt: new Date('2024-01-15'), paidAmount: new Decimal(500) },
        { paidAt: new Date('2024-01-15'), paidAmount: new Decimal(300) },
        { paidAt: new Date('2024-01-16'), paidAmount: new Decimal(700) },
      ]);

      const result = await service.executeTool(
        'get_revenue_summary',
        { startDate: '2024-01-15', endDate: '2024-01-17', groupBy: 'day' },
        mockTenantId,
      );

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('breakdown');
      expect(prisma.invoice.findMany).toHaveBeenCalled();
    });

    it('should return revenue grouped by week', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        { paidAt: new Date('2024-01-08'), paidAmount: new Decimal(1000) },
        { paidAt: new Date('2024-01-15'), paidAmount: new Decimal(1500) },
      ]);

      const result = await service.executeTool(
        'get_revenue_summary',
        { startDate: '2024-01-01', endDate: '2024-01-21', groupBy: 'week' },
        mockTenantId,
      );

      expect(result).toHaveProperty('total');
    });
  });

  describe('get_appointment_stats', () => {
    it('should return completion and no-show rates', async () => {
      prisma.appointment.findMany.mockResolvedValue([
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'NO_SHOW' },
        { status: 'CANCELLED' },
        { status: 'SCHEDULED' },
      ]);

      const result = await service.executeTool(
        'get_appointment_stats',
        { startDate: weekAgo.toISOString(), endDate: today.toISOString() },
        mockTenantId,
      );

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('noShows');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('noShowRate');
    });
  });

  describe('get_customer_list', () => {
    it('should filter by status', async () => {
      prisma.customer.findMany.mockResolvedValue([
        { id: 'c1', name: 'John', healthScore: 30, churnRisk: 0.7 },
        { id: 'c2', name: 'Jane', healthScore: 25, churnRisk: 0.8 },
      ]);

      const result = await service.executeTool(
        'get_customer_list',
        { status: 'at_risk', limit: 10 },
        mockTenantId,
      );

      expect(result).toHaveProperty('customers');
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should sort by CLV', async () => {
      prisma.customer.findMany.mockResolvedValue([
        { id: 'c1', name: 'John', context: { totalSpent: 5000 } },
        { id: 'c2', name: 'Jane', context: { totalSpent: 3000 } },
      ]);

      const result = await service.executeTool(
        'get_customer_list',
        { sortBy: 'clv', limit: 10 },
        mockTenantId,
      );

      expect(result).toHaveProperty('customers');
    });
  });

  describe('get_technician_performance', () => {
    it('should return metrics per technician', async () => {
      prisma.job.findMany.mockResolvedValue([
        { technicianId: 'tech-1', status: 'COMPLETED', technician: { name: 'Mike' } },
        { technicianId: 'tech-1', status: 'COMPLETED', technician: { name: 'Mike' } },
        { technicianId: 'tech-2', status: 'COMPLETED', technician: { name: 'Sarah' } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'tech-1', name: 'Mike' },
        { id: 'tech-2', name: 'Sarah' },
      ]);

      const result = await service.executeTool(
        'get_technician_performance',
        { startDate: weekAgo.toISOString(), endDate: today.toISOString() },
        mockTenantId,
      );

      expect(result).toHaveProperty('technicians');
    });
  });

  describe('get_quote_pipeline', () => {
    it('should return funnel metrics', async () => {
      prisma.quote.findMany.mockResolvedValue([
        { status: 'SENT', amount: new Decimal(1000) },
        { status: 'ACCEPTED', amount: new Decimal(1500) },
        { status: 'REJECTED', amount: new Decimal(800) },
        { status: 'EXPIRED', amount: new Decimal(600) },
      ]);

      const result = await service.executeTool(
        'get_quote_pipeline',
        { startDate: weekAgo.toISOString(), endDate: today.toISOString() },
        mockTenantId,
      );

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('accepted');
      expect(result).toHaveProperty('conversionRate');
    });
  });

  describe('get_invoice_aging', () => {
    it('should group by age buckets', async () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      prisma.invoice.findMany.mockResolvedValue([
        { dueDate: fiveDaysAgo, amount: new Decimal(500), paidAmount: new Decimal(0) },
        { dueDate: fifteenDaysAgo, amount: new Decimal(800), paidAmount: new Decimal(0) },
        { dueDate: fortyDaysAgo, amount: new Decimal(1200), paidAmount: new Decimal(0) },
      ]);

      const result = await service.executeTool('get_invoice_aging', {}, mockTenantId);

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('thirtyDays');
      expect(result).toHaveProperty('sixtyDays');
      expect(result).toHaveProperty('ninetyPlus');
      expect(result).toHaveProperty('total');
    });
  });

  describe('get_service_profitability', () => {
    it('should return revenue and margin', async () => {
      prisma.job.findMany.mockResolvedValue([
        {
          appointment: {
            service: { id: 's1', name: 'AC Repair', price: new Decimal(200) },
          },
        },
        {
          appointment: {
            service: { id: 's1', name: 'AC Repair', price: new Decimal(200) },
          },
        },
        {
          appointment: {
            service: { id: 's2', name: 'Plumbing', price: new Decimal(150) },
          },
        },
      ]);

      const result = await service.executeTool(
        'get_service_profitability',
        { startDate: weekAgo.toISOString(), endDate: today.toISOString() },
        mockTenantId,
      );

      expect(result).toHaveProperty('services');
    });
  });

  describe('get_customer_satisfaction', () => {
    it('should return NPS and review stats', async () => {
      prisma.npsSurvey.findMany.mockResolvedValue([
        { score: 9 },
        { score: 10 },
        { score: 8 },
        { score: 6 },
      ]);
      prisma.reviewRequest.findMany.mockResolvedValue([
        { status: 'CLICKED' },
        { status: 'SENT' },
      ]);

      const result = await service.executeTool(
        'get_customer_satisfaction',
        { startDate: weekAgo.toISOString(), endDate: today.toISOString() },
        mockTenantId,
      );

      expect(result).toHaveProperty('npsScore');
      expect(result).toHaveProperty('promoters');
      expect(result).toHaveProperty('detractors');
      expect(result).toHaveProperty('reviewsRequested');
    });
  });

  describe('get_retention_metrics', () => {
    it('should return churn and CLV metrics', async () => {
      prisma.customer.findMany.mockResolvedValue([
        { healthScore: 80, churnRisk: 0.1, context: { totalSpent: 5000 } },
        { healthScore: 30, churnRisk: 0.8, context: { totalSpent: 2000 } },
        { healthScore: 50, churnRisk: 0.4, context: { totalSpent: 3000 } },
      ]);

      const result = await service.executeTool('get_retention_metrics', {}, mockTenantId);

      expect(result).toHaveProperty('totalCustomers');
      expect(result).toHaveProperty('atRiskCount');
      expect(result).toHaveProperty('averageHealthScore');
      expect(result).toHaveProperty('averageCLV');
    });
  });

  describe('get_schedule_utilization', () => {
    it('should return utilization percentage', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'tech-1', name: 'Mike' },
        { id: 'tech-2', name: 'Sarah' },
      ]);
      prisma.appointment.findMany.mockResolvedValue([
        { assignedTo: 'tech-1', duration: 60 },
        { assignedTo: 'tech-1', duration: 120 },
        { assignedTo: 'tech-2', duration: 90 },
      ]);
      prisma.technicianAvailability.findMany.mockResolvedValue([
        { userId: 'tech-1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { userId: 'tech-2', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      ]);

      const result = await service.executeTool(
        'get_schedule_utilization',
        { startDate: weekAgo.toISOString(), endDate: today.toISOString() },
        mockTenantId,
      );

      expect(result).toHaveProperty('overallUtilization');
      expect(result).toHaveProperty('technicians');
    });
  });
});
