import { Test, TestingModule } from '@nestjs/testing';
import { DispatchIntelligenceService, DurationEstimate, UpsellSuggestion } from './dispatch-intelligence.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock';
import { SkillLevel } from '@prisma/client';

describe('DispatchIntelligenceService', () => {
  let service: DispatchIntelligenceService;
  let prisma: MockPrismaService;
  let aiEngine: jest.Mocked<AiEngineService>;

  const tenantId = 'tenant-1';
  const jobId = 'job-1';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    aiEngine = {
      analyze: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchIntelligenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiEngineService, useValue: aiEngine },
      ],
    }).compile();

    service = module.get<DispatchIntelligenceService>(DispatchIntelligenceService);
  });

  describe('estimateDuration', () => {
    it('should call AI with correct template and variables', async () => {
      const mockJob = {
        id: jobId,
        tenantId,
        technicianId: 'tech-1',
        technician: { id: 'tech-1', name: 'John Tech' },
        appointment: {
          service: { name: 'HVAC Repair', description: 'AC repair service' },
          customer: {
            name: 'Jane Customer',
            equipment: [
              { equipmentType: 'HVAC', brand: 'Carrier', model: '2020', condition: 'GOOD', installDate: new Date('2020-01-01') },
            ],
          },
        },
      };

      prisma.job.findUnique.mockResolvedValue(mockJob);

      const mockAiResponse = {
        data: {
          estimatedMinutes: 90,
          confidenceRange: { min: 60, max: 120 },
          complexityFactors: ['Older equipment', 'First visit'],
          bufferRecommendation: 15,
        },
        inputTokens: 500,
        outputTokens: 100,
        latencyMs: 1500,
        cached: false,
      };

      aiEngine.analyze.mockResolvedValue(mockAiResponse);

      const result = await service.estimateDuration(jobId, tenantId);

      expect(result.estimatedMinutes).toBe(90);
      expect(result.confidenceRange).toEqual({ min: 60, max: 120 });
      expect(result.complexityFactors).toContain('Older equipment');
      expect(result.bufferRecommendation).toBe(15);

      expect(aiEngine.analyze).toHaveBeenCalledWith(expect.objectContaining({
        template: 'dispatch.estimate-duration',
        feature: 'dispatch',
        tenantId,
      }));
    });

    it('should handle missing equipment gracefully', async () => {
      const mockJob = {
        id: jobId,
        tenantId,
        technicianId: 'tech-1',
        technician: { id: 'tech-1', name: 'John Tech' },
        appointment: {
          service: { name: 'General Maintenance', description: 'Basic maintenance' },
          customer: {
            name: 'Jane Customer',
            equipment: [],
          },
        },
      };

      prisma.job.findUnique.mockResolvedValue(mockJob);

      const mockAiResponse = {
        data: {
          estimatedMinutes: 60,
          confidenceRange: { min: 45, max: 90 },
          complexityFactors: ['Unknown equipment'],
          bufferRecommendation: 30,
        },
        inputTokens: 400,
        outputTokens: 80,
        latencyMs: 1200,
        cached: false,
      };

      aiEngine.analyze.mockResolvedValue(mockAiResponse);

      const result = await service.estimateDuration(jobId, tenantId);

      expect(result.estimatedMinutes).toBe(60);
      expect(result.bufferRecommendation).toBe(30); // Higher buffer due to unknown equipment
    });

    it('should fallback to service default if AI unavailable', async () => {
      const mockJob = {
        id: jobId,
        tenantId,
        technicianId: 'tech-1',
        technician: { id: 'tech-1', name: 'John Tech' },
        appointment: {
          duration: 60,
          service: { name: 'Quick Fix', description: 'Simple repair', durationMinutes: 60 },
          customer: { name: 'Jane Customer', equipment: [] },
        },
      };

      prisma.job.findUnique.mockResolvedValue(mockJob);
      aiEngine.isReady.mockReturnValue(false);

      const result = await service.estimateDuration(jobId, tenantId);

      expect(result.estimatedMinutes).toBe(60);
      expect(result.complexityFactors).toContain('AI unavailable - using service default');
      expect(aiEngine.analyze).not.toHaveBeenCalled();
    });
  });

  describe('suggestUpsells', () => {
    it('should call AI with equipment and history', async () => {
      const mockJob = {
        id: jobId,
        tenantId,
        appointment: {
          service: { name: 'AC Tune-up' },
          customer: {
            id: 'customer-1',
            name: 'Jane Customer',
            equipment: [
              { equipmentType: 'HVAC', brand: 'Carrier', condition: 'FAIR' },
              { equipmentType: 'Water Heater', brand: 'Rheem', condition: 'POOR' },
            ],
          },
        },
      };

      prisma.job.findUnique.mockResolvedValue(mockJob);

      // Mock historical spend
      prisma.invoice.aggregate.mockResolvedValue({ _sum: { amount: 500 } });

      // Mock maintenance alerts
      prisma.maintenanceAlert.findMany.mockResolvedValue([
        { title: 'Water Heater needs service', priority: 'HIGH' },
      ]);

      const mockAiResponse = {
        data: {
          upsellOpportunities: [
            {
              service: 'Water Heater Flush',
              confidence: 0.85,
              reason: 'Equipment is in poor condition',
              suggestedPitch: 'While I am here, I noticed your water heater needs attention.',
              estimatedRevenue: 150,
            },
          ],
          totalUpsellPotential: 150,
        },
        inputTokens: 600,
        outputTokens: 150,
        latencyMs: 2000,
        cached: false,
      };

      aiEngine.analyze.mockResolvedValue(mockAiResponse);

      const result = await service.suggestUpsells(jobId, tenantId);

      expect(result.opportunities).toHaveLength(1);
      expect(result.opportunities[0].service).toBe('Water Heater Flush');
      expect(result.opportunities[0].confidence).toBe(0.85);
      expect(result.totalPotential).toBe(150);

      expect(aiEngine.analyze).toHaveBeenCalledWith(expect.objectContaining({
        template: 'dispatch.suggest-upsell',
        feature: 'dispatch',
        tenantId,
      }));
    });

    it('should return empty opportunities when none found', async () => {
      const mockJob = {
        id: jobId,
        tenantId,
        appointment: {
          service: { name: 'Full System Replacement' },
          customer: {
            id: 'customer-1',
            name: 'Jane Customer',
            equipment: [{ equipmentType: 'HVAC', condition: 'EXCELLENT' }],
          },
        },
      };

      prisma.job.findUnique.mockResolvedValue(mockJob);
      prisma.invoice.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
      prisma.maintenanceAlert.findMany.mockResolvedValue([]);

      const mockAiResponse = {
        data: {
          upsellOpportunities: [],
          totalUpsellPotential: 0,
        },
        inputTokens: 500,
        outputTokens: 50,
        latencyMs: 1000,
        cached: false,
      };

      aiEngine.analyze.mockResolvedValue(mockAiResponse);

      const result = await service.suggestUpsells(jobId, tenantId);

      expect(result.opportunities).toHaveLength(0);
      expect(result.totalPotential).toBe(0);
    });

    it('should handle AI errors gracefully', async () => {
      const mockJob = {
        id: jobId,
        tenantId,
        appointment: {
          service: { name: 'AC Tune-up' },
          customer: {
            id: 'customer-1',
            name: 'Jane Customer',
            equipment: [],
          },
        },
      };

      prisma.job.findUnique.mockResolvedValue(mockJob);
      prisma.invoice.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
      prisma.maintenanceAlert.findMany.mockResolvedValue([]);

      aiEngine.analyze.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.suggestUpsells(jobId, tenantId);

      expect(result.opportunities).toHaveLength(0);
      expect(result.totalPotential).toBe(0);
    });
  });
});
