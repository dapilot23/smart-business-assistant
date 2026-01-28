import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  RetentionSequenceService,
  RETENTION_QUEUE,
} from './retention-sequence.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('RetentionSequenceService', () => {
  let service: RetentionSequenceService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let mockQueue: { add: jest.Mock; getJob: jest.Mock };

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionSequenceService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: getQueueToken(RETENTION_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<RetentionSequenceService>(RetentionSequenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSequence', () => {
    it('should create 3 campaign records with correct steps and channels', async () => {
      let createCallIndex = 0;
      prisma.retentionCampaign.create.mockImplementation(async ({ data }) => ({
        id: `campaign-${++createCallIndex}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await service.createSequence(mockTenantId, mockCustomerId, 'DORMANT_WINBACK');

      expect(prisma.retentionCampaign.create).toHaveBeenCalledTimes(3);

      const call1 = prisma.retentionCampaign.create.mock.calls[0][0].data;
      expect(call1).toMatchObject({
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        type: 'DORMANT_WINBACK',
        step: 1,
        channel: 'SMS',
        status: 'PENDING',
      });
      expect(call1.scheduledAt).toBeInstanceOf(Date);

      const call2 = prisma.retentionCampaign.create.mock.calls[1][0].data;
      expect(call2).toMatchObject({
        step: 2,
        channel: 'EMAIL',
      });

      const call3 = prisma.retentionCampaign.create.mock.calls[2][0].data;
      expect(call3).toMatchObject({
        step: 3,
        channel: 'SMS',
      });
    });

    it('should enqueue 3 BullMQ jobs with correct delays', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      let createCallIndex = 0;
      prisma.retentionCampaign.create.mockImplementation(async ({ data }) => ({
        id: `campaign-${++createCallIndex}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await service.createSequence(mockTenantId, mockCustomerId, 'SEASONAL');

      expect(mockQueue.add).toHaveBeenCalledTimes(3);

      const job1 = mockQueue.add.mock.calls[0];
      expect(job1[0]).toBe('process-retention');
      expect(job1[1]).toMatchObject({
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        campaignId: 'campaign-1',
        step: 1,
        channel: 'SMS',
        type: 'SEASONAL',
      });
      expect(job1[2]).toMatchObject({
        delay: 0,
        jobId: 'retention-campaign-1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      });

      const job2 = mockQueue.add.mock.calls[1];
      expect(job2[2].delay).toBe(7 * 24 * 60 * 60 * 1000);
      expect(job2[2].jobId).toBe('retention-campaign-2');

      const job3 = mockQueue.add.mock.calls[2];
      expect(job3[2].delay).toBe(14 * 24 * 60 * 60 * 1000);
      expect(job3[2].jobId).toBe('retention-campaign-3');

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should set job IDs as retention-{campaignId} for later removal', async () => {
      prisma.retentionCampaign.create.mockImplementation(async ({ data }) => ({
        id: 'campaign-abc-123',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await service.createSequence(mockTenantId, mockCustomerId, 'MAINTENANCE');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-retention',
        expect.any(Object),
        expect.objectContaining({
          jobId: 'retention-campaign-abc-123',
        }),
      );
    });

    it('should handle all campaign types correctly', async () => {
      const types = ['DORMANT_WINBACK', 'SEASONAL', 'MAINTENANCE'];

      for (const type of types) {
        jest.clearAllMocks();
        prisma.retentionCampaign.create.mockImplementation(async ({ data }) => ({
          id: `campaign-${type}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await service.createSequence(mockTenantId, mockCustomerId, type);

        expect(prisma.retentionCampaign.create).toHaveBeenCalledTimes(3);
        const callData = prisma.retentionCampaign.create.mock.calls[0][0].data;
        expect(callData.type).toBe(type);
      }
    });
  });

  describe('cancelSequence', () => {
    const mockPendingCampaigns = [
      { id: 'campaign-a', customerId: mockCustomerId, status: 'PENDING', step: 1 },
      { id: 'campaign-b', customerId: mockCustomerId, status: 'PENDING', step: 2 },
      { id: 'campaign-c', customerId: mockCustomerId, status: 'PENDING', step: 3 },
    ];

    it('should update all pending campaigns to CANCELLED', async () => {
      prisma.retentionCampaign.findMany.mockResolvedValue(mockPendingCampaigns);
      prisma.retentionCampaign.updateMany.mockResolvedValue({ count: 3 });

      const mockJob = { remove: jest.fn() };
      mockQueue.getJob.mockResolvedValue(mockJob);

      await service.cancelSequence(mockCustomerId);

      expect(prisma.retentionCampaign.findMany).toHaveBeenCalledWith({
        where: { customerId: mockCustomerId, status: 'PENDING' },
      });

      expect(prisma.retentionCampaign.updateMany).toHaveBeenCalledWith({
        where: { customerId: mockCustomerId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should remove BullMQ jobs by ID', async () => {
      prisma.retentionCampaign.findMany.mockResolvedValue(mockPendingCampaigns);
      prisma.retentionCampaign.updateMany.mockResolvedValue({ count: 3 });

      const mockJobA = { remove: jest.fn() };
      const mockJobB = { remove: jest.fn() };
      const mockJobC = { remove: jest.fn() };

      mockQueue.getJob
        .mockResolvedValueOnce(mockJobA)
        .mockResolvedValueOnce(mockJobB)
        .mockResolvedValueOnce(mockJobC);

      await service.cancelSequence(mockCustomerId);

      expect(mockQueue.getJob).toHaveBeenCalledWith('retention-campaign-a');
      expect(mockQueue.getJob).toHaveBeenCalledWith('retention-campaign-b');
      expect(mockQueue.getJob).toHaveBeenCalledWith('retention-campaign-c');

      expect(mockJobA.remove).toHaveBeenCalled();
      expect(mockJobB.remove).toHaveBeenCalled();
      expect(mockJobC.remove).toHaveBeenCalled();
    });

    it('should do nothing if no pending campaigns exist', async () => {
      prisma.retentionCampaign.findMany.mockResolvedValue([]);

      await service.cancelSequence(mockCustomerId);

      expect(prisma.retentionCampaign.updateMany).not.toHaveBeenCalled();
      expect(mockQueue.getJob).not.toHaveBeenCalled();
    });

    it('should handle job not found in queue gracefully', async () => {
      prisma.retentionCampaign.findMany.mockResolvedValue([
        mockPendingCampaigns[0],
      ]);
      prisma.retentionCampaign.updateMany.mockResolvedValue({ count: 1 });

      mockQueue.getJob.mockResolvedValue(null);

      await service.cancelSequence(mockCustomerId);

      expect(mockQueue.getJob).toHaveBeenCalledWith('retention-campaign-a');
    });

    it('should continue cancelling remaining jobs when one removal fails', async () => {
      prisma.retentionCampaign.findMany.mockResolvedValue(
        mockPendingCampaigns,
      );
      prisma.retentionCampaign.updateMany.mockResolvedValue({ count: 3 });

      const mockJobB = { remove: jest.fn() };
      const mockJobC = { remove: jest.fn() };

      mockQueue.getJob
        .mockRejectedValueOnce(new Error('Redis connection error'))
        .mockResolvedValueOnce(mockJobB)
        .mockResolvedValueOnce(mockJobC);

      await service.cancelSequence(mockCustomerId);

      expect(mockQueue.getJob).toHaveBeenCalledTimes(3);
      expect(mockJobB.remove).toHaveBeenCalled();
      expect(mockJobC.remove).toHaveBeenCalled();
    });
  });

  describe('getActiveCampaigns', () => {
    it('should return pending campaigns for the given tenant', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          tenantId: mockTenantId,
          customerId: 'customer-1',
          type: 'DORMANT_WINBACK',
          step: 1,
          channel: 'SMS',
          status: 'PENDING',
          scheduledAt: new Date('2026-02-01'),
        },
        {
          id: 'campaign-2',
          tenantId: mockTenantId,
          customerId: 'customer-2',
          type: 'SEASONAL',
          step: 2,
          channel: 'EMAIL',
          status: 'PENDING',
          scheduledAt: new Date('2026-02-08'),
        },
      ];

      prisma.retentionCampaign.findMany.mockResolvedValue(mockCampaigns);

      const result = await service.getActiveCampaigns(mockTenantId);

      expect(prisma.retentionCampaign.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, status: 'PENDING' },
        orderBy: { scheduledAt: 'asc' },
      });

      expect(result).toEqual(mockCampaigns);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no campaigns exist', async () => {
      prisma.retentionCampaign.findMany.mockResolvedValue([]);

      const result = await service.getActiveCampaigns(mockTenantId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
