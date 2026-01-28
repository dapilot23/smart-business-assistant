import { Test, TestingModule } from '@nestjs/testing';
import {
  RetentionIntelligenceService,
  ChurnPrediction,
  ServiceNeed,
} from './retention-intelligence.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('RetentionIntelligenceService', () => {
  let service: RetentionIntelligenceService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let mockAiEngine: {
    analyze: jest.Mock;
    generateText: jest.Mock;
    isReady: jest.Mock;
  };

  const tenantId = 'tenant-001';
  const customerId = 'cust-001';
  const now = new Date('2026-01-28T12:00:00Z');

  const mockChurnResult: ChurnPrediction = {
    churnProbability: 0.7,
    churnTimeframe: '30_days',
    churnReasons: ['inactivity'],
    riskLevel: 'HIGH',
    recommendedIntervention: {
      type: 'personal_call',
      message: 'Call them',
      urgency: 'immediate',
    },
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now });
    prisma = createMockPrismaService();
    (prisma as any).customerEquipment = {
      findMany: jest.fn().mockResolvedValue([]),
    };

    mockAiEngine = {
      analyze: jest.fn().mockResolvedValue({
        data: mockChurnResult,
        inputTokens: 500,
        outputTokens: 200,
        latencyMs: 800,
        cached: false,
      }),
      generateText: jest.fn().mockResolvedValue({
        data: 'Hi John, we miss you! Come back for a tune-up.',
        inputTokens: 300,
        outputTokens: 50,
        latencyMs: 500,
        cached: false,
      }),
      isReady: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionIntelligenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiEngineService, useValue: mockAiEngine },
      ],
    }).compile();

    service = module.get(RetentionIntelligenceService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // --- Helper to build a mock customer with sensible defaults ---
  function buildCustomer(overrides: Record<string, unknown> = {}) {
    return {
      id: customerId,
      tenantId,
      name: 'John Doe',
      createdAt: new Date('2025-01-01'),
      noShowCount: 0,
      healthScore: 50,
      churnRisk: 0,
      lifecycleStage: 'ACTIVE',
      context: {
        totalVisits: 10,
        totalSpent: 2500,
        lastServiceType: 'AC Repair',
        lastInteraction: new Date('2026-01-20'),
      },
      appointments: [],
      invoices: [],
      equipment: [],
      tenant: { id: tenantId, name: 'Cool HVAC Co' },
      ...overrides,
    };
  }

  // =================================================================
  // computeHealthScore
  // =================================================================
  describe('computeHealthScore', () => {
    it('should return high score for active customer with recent appointments and payments', async () => {
      const recentDate = new Date('2026-01-25');
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          createdAt: new Date('2025-01-01'),
          appointments: [
            { status: 'COMPLETED', scheduledAt: recentDate },
            { status: 'COMPLETED', scheduledAt: new Date('2025-11-01') },
            { status: 'COMPLETED', scheduledAt: new Date('2025-09-01') },
          ],
          invoices: [
            { status: 'PAID' },
            { status: 'PAID' },
            { status: 'PAID' },
          ],
        }),
      );

      const score = await service.computeHealthScore(customerId, tenantId);

      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return low score for customer with no recent appointments', async () => {
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          createdAt: new Date('2024-01-01'),
          appointments: [
            { status: 'COMPLETED', scheduledAt: new Date('2024-06-01') },
          ],
          invoices: [{ status: 'PAID' }],
          context: {
            totalVisits: 1,
            totalSpent: 200,
            lastInteraction: new Date('2024-06-01'),
          },
        }),
      );

      const score = await service.computeHealthScore(customerId, tenantId);

      expect(score).toBeLessThan(40);
    });

    it('should penalize for no-shows', async () => {
      const baseCustomer = buildCustomer({
        appointments: [
          { status: 'COMPLETED', scheduledAt: new Date('2026-01-20') },
        ],
        invoices: [{ status: 'PAID' }],
      });

      // Score without no-shows
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({ ...baseCustomer, noShowCount: 0 }),
      );
      const scoreClean = await service.computeHealthScore(customerId, tenantId);

      // Score with no-shows
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({ ...baseCustomer, noShowCount: 5 }),
      );
      const scoreDirty = await service.computeHealthScore(customerId, tenantId);

      expect(scoreDirty).toBeLessThan(scoreClean);
    });

    it('should clamp score between 0 and 100', async () => {
      // Customer with best possible metrics
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          createdAt: new Date('2026-01-01'),
          appointments: Array.from({ length: 20 }, () => ({
            status: 'COMPLETED',
            scheduledAt: new Date('2026-01-27'),
          })),
          invoices: Array.from({ length: 20 }, () => ({ status: 'PAID' })),
        }),
      );

      const highScore = await service.computeHealthScore(customerId, tenantId);
      expect(highScore).toBeLessThanOrEqual(100);
      expect(highScore).toBeGreaterThanOrEqual(0);

      // Customer with worst possible metrics
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          createdAt: new Date('2020-01-01'),
          appointments: [],
          invoices: [{ status: 'OVERDUE' }, { status: 'OVERDUE' }],
          noShowCount: 20,
          context: null,
        }),
      );

      const lowScore = await service.computeHealthScore(customerId, tenantId);
      expect(lowScore).toBeGreaterThanOrEqual(0);
      expect(lowScore).toBeLessThanOrEqual(100);
    });
  });

  // =================================================================
  // predictChurn
  // =================================================================
  describe('predictChurn', () => {
    beforeEach(() => {
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          appointments: [
            { status: 'COMPLETED', scheduledAt: new Date('2025-12-01') },
          ],
          invoices: [{ status: 'PAID' }],
        }),
      );
      prisma.customer.update.mockResolvedValue({});
    });

    it('should call AI engine with correct template and variables', async () => {
      await service.predictChurn(customerId, tenantId);

      expect(mockAiEngine.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'retention.predict-churn',
          tenantId,
          feature: 'retention-churn',
          variables: expect.objectContaining({
            healthScore: expect.any(Number),
            daysSinceLastService: expect.any(Number),
          }),
        }),
      );
    });

    it('should update customer churnRisk and lifecycleStage', async () => {
      await service.predictChurn(customerId, tenantId);

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: {
          churnRisk: 0.7,
          lifecycleStage: 'AT_RISK',
        },
      });
    });

    it('should map HIGH risk level to AT_RISK lifecycle stage', async () => {
      mockAiEngine.analyze.mockResolvedValue({
        data: { ...mockChurnResult, riskLevel: 'HIGH' },
        inputTokens: 500,
        outputTokens: 200,
        latencyMs: 800,
        cached: false,
      });

      const result = await service.predictChurn(customerId, tenantId);

      expect(result.riskLevel).toBe('HIGH');
      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lifecycleStage: 'AT_RISK',
          }),
        }),
      );
    });
  });

  // =================================================================
  // generateWinbackMessage
  // =================================================================
  describe('generateWinbackMessage', () => {
    beforeEach(() => {
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          appointments: [
            { status: 'COMPLETED', scheduledAt: new Date('2025-12-01') },
          ],
        }),
      );
    });

    it('should call AI engine generateText with correct variables', async () => {
      await service.generateWinbackMessage(customerId, tenantId);

      expect(mockAiEngine.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'retention.generate-winback',
          tenantId,
          feature: 'retention-winback',
          variables: expect.objectContaining({
            customerName: 'John Doe',
            lastService: 'AC Repair',
            daysSinceLastVisit: expect.any(Number),
            totalVisits: 10,
            totalSpent: 2500,
            businessName: 'Cool HVAC Co',
          }),
        }),
      );
    });

    it('should use friendly tone', async () => {
      await service.generateWinbackMessage(customerId, tenantId);

      expect(mockAiEngine.generateText).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'friendly' }),
      );
    });
  });

  // =================================================================
  // predictServiceNeeds
  // =================================================================
  describe('predictServiceNeeds', () => {
    const mockNeeds: ServiceNeed[] = [
      {
        service: 'AC Tune-Up',
        predictedDate: '2026-04-15',
        confidence: 0.85,
        reason: 'Seasonal maintenance',
      },
    ];

    beforeEach(() => {
      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          equipment: [
            { equipmentType: 'HVAC', brand: 'Carrier', model: 'X100' },
          ],
          appointments: [
            {
              status: 'COMPLETED',
              scheduledAt: new Date('2025-10-01'),
              service: { name: 'AC Repair' },
            },
          ],
        }),
      );

      mockAiEngine.analyze.mockResolvedValue({
        data: { predictedNeeds: mockNeeds },
        inputTokens: 400,
        outputTokens: 150,
        latencyMs: 700,
        cached: false,
      });
    });

    it('should call AI engine with equipment and history data', async () => {
      await service.predictServiceNeeds(customerId, tenantId);

      expect(mockAiEngine.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'retention.predict-service-need',
          tenantId,
          feature: 'retention-service-needs',
          variables: expect.objectContaining({
            customerEquipment: expect.any(Array),
            serviceHistory: expect.any(Array),
          }),
        }),
      );
    });

    it('should return predicted service needs array', async () => {
      const result = await service.predictServiceNeeds(customerId, tenantId);

      expect(result).toEqual(mockNeeds);
      expect(result).toHaveLength(1);
      expect(result[0].service).toBe('AC Tune-Up');
    });
  });

  // =================================================================
  // updateAllHealthScores
  // =================================================================
  describe('updateAllHealthScores', () => {
    it('should process all customers across all tenants', async () => {
      prisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant-a' },
        { id: 'tenant-b' },
      ]);

      prisma.customer.findMany.mockResolvedValue([
        buildCustomer({ id: 'cust-1' }),
        buildCustomer({ id: 'cust-2' }),
      ]);

      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          appointments: [
            { status: 'COMPLETED', scheduledAt: new Date('2026-01-20') },
          ],
          invoices: [{ status: 'PAID' }],
        }),
      );
      prisma.customer.update.mockResolvedValue({});

      await service.updateAllHealthScores();

      // 2 tenants x 2 customers = 4 update calls
      expect(prisma.customer.update).toHaveBeenCalledTimes(4);
    });

    it('should update healthScore on each customer record', async () => {
      prisma.tenant.findMany.mockResolvedValue([{ id: tenantId }]);

      prisma.customer.findMany.mockResolvedValue([
        buildCustomer({ id: 'cust-1' }),
      ]);

      prisma.customer.findUnique.mockResolvedValue(
        buildCustomer({
          appointments: [
            { status: 'COMPLETED', scheduledAt: new Date('2026-01-20') },
          ],
          invoices: [{ status: 'PAID' }],
        }),
      );
      prisma.customer.update.mockResolvedValue({});

      await service.updateAllHealthScores();

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-1' },
          data: expect.objectContaining({
            healthScore: expect.any(Number),
            lifecycleStage: expect.any(String),
          }),
        }),
      );
    });
  });
});
