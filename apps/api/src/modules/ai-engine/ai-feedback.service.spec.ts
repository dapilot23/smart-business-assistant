import { Test, TestingModule } from '@nestjs/testing';
import { AiFeedbackService } from './ai-feedback.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';

describe('AiFeedbackService', () => {
  let service: AiFeedbackService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiFeedbackService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AiFeedbackService>(AiFeedbackService);
  });

  describe('recordFeedback', () => {
    it('should create AiFeedback record with ACCEPTED action', async () => {
      prisma.aiFeedback.create.mockResolvedValue({});

      await service.recordFeedback({
        tenantId: 'tenant-1',
        feature: 'quote-followup',
        template: 'quote.generate-followup',
        aiOutput: 'Hi Sarah, checking in about your quote...',
        action: 'ACCEPTED',
      });

      expect(prisma.aiFeedback.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          feature: 'quote-followup',
          template: 'quote.generate-followup',
          aiOutput: 'Hi Sarah, checking in about your quote...',
          action: 'ACCEPTED',
          humanEdit: undefined,
        },
      });
    });

    it('should store humanEdit when action is EDITED', async () => {
      prisma.aiFeedback.create.mockResolvedValue({});

      await service.recordFeedback({
        tenantId: 'tenant-1',
        feature: 'review-response',
        template: 'review.draft-response',
        aiOutput: 'Thank you for the review!',
        action: 'EDITED',
        humanEdit: 'Thanks so much for the kind words!',
      });

      expect(prisma.aiFeedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EDITED',
          humanEdit: 'Thanks so much for the kind words!',
        }),
      });
    });

    it('should not include humanEdit when action is REJECTED', async () => {
      prisma.aiFeedback.create.mockResolvedValue({});

      await service.recordFeedback({
        tenantId: 'tenant-1',
        feature: 'quote-followup',
        template: 'quote.generate-followup',
        aiOutput: 'Bad message',
        action: 'REJECTED',
      });

      expect(prisma.aiFeedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'REJECTED',
          humanEdit: undefined,
        }),
      });
    });
  });

  describe('getAcceptanceRate', () => {
    it('should calculate correct acceptance rate', async () => {
      prisma.aiFeedback.count.mockResolvedValueOnce(20); // total
      prisma.aiFeedback.count.mockResolvedValueOnce(14); // accepted
      prisma.aiFeedback.count.mockResolvedValueOnce(4); // edited
      prisma.aiFeedback.count.mockResolvedValueOnce(2); // rejected

      const result = await service.getAcceptanceRate(
        'tenant-1',
        'quote-followup',
      );

      expect(result.total).toBe(20);
      expect(result.accepted).toBe(14);
      expect(result.edited).toBe(4);
      expect(result.rejected).toBe(2);
      expect(result.acceptanceRate).toBe(0.7);
    });

    it('should filter by date range when days specified', async () => {
      prisma.aiFeedback.count.mockResolvedValue(0);

      await service.getAcceptanceRate('tenant-1', 'quote-followup', 30);

      expect(prisma.aiFeedback.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          feature: 'quote-followup',
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      });
    });

    it('should return 0 rate when no feedback exists', async () => {
      prisma.aiFeedback.count.mockResolvedValue(0);

      const result = await service.getAcceptanceRate(
        'tenant-1',
        'quote-followup',
      );

      expect(result.total).toBe(0);
      expect(result.acceptanceRate).toBe(0);
    });
  });

  describe('getTenantAcceptanceRates', () => {
    it('should return rates grouped by feature', async () => {
      prisma.aiFeedback.groupBy.mockResolvedValue([
        { feature: 'quote-followup', _count: { id: 15 } },
        { feature: 'review-response', _count: { id: 8 } },
      ]);
      prisma.aiFeedback.count
        .mockResolvedValueOnce(12) // quote-followup accepted
        .mockResolvedValueOnce(5); // review-response accepted

      const result = await service.getTenantAcceptanceRates('tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0].feature).toBe('quote-followup');
      expect(result[0].total).toBe(15);
      expect(result[0].acceptanceRate).toBe(0.8);
      expect(result[1].feature).toBe('review-response');
      expect(result[1].total).toBe(8);
    });
  });
});
