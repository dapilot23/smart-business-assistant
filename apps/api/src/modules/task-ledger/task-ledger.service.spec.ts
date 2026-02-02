import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { TaskLedgerService } from './task-ledger.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import { createMockPrismaService } from '../../test/prisma-mock';
import {
  TASK_LEDGER_QUEUE,
  TaskLedgerType,
  TaskLedgerCategory,
} from './types';

describe('TaskLedgerService', () => {
  let service: TaskLedgerService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let eventsService: { emit: jest.Mock };
  let queue: { add: jest.Mock; getJob: jest.Mock };

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockTaskId = 'task-789';

  const mockTask = {
    id: mockTaskId,
    tenantId: mockTenantId,
    type: TaskLedgerType.AI_ACTION,
    category: TaskLedgerCategory.BILLING,
    status: 'PENDING',
    priority: 50,
    title: 'Send payment reminder',
    description: 'Send reminder for invoice #1234',
    icon: 'bell',
    entityType: 'invoice',
    entityId: 'invoice-123',
    actionType: 'SEND_PAYMENT_REMINDER',
    actionEndpoint: null,
    payload: { amount: 100 },
    idempotencyKey: 'abc123',
    traceId: 'trace-456',
    scheduledFor: null,
    undoWindowMins: 5,
    undoEndpoint: null,
    undoPayload: null,
    undoneAt: null,
    undoneBy: null,
    executedAt: null,
    executedBy: null,
    failureReason: null,
    result: null,
    retryCount: 0,
    maxRetries: 3,
    aiConfidence: 0.95,
    aiReasoning: 'Customer has overdue invoice',
    aiModel: 'gpt-4',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    eventsService = { emit: jest.fn() };
    queue = { add: jest.fn(), getJob: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: eventsService },
        { provide: getQueueToken(TASK_LEDGER_QUEUE), useValue: queue },
      ],
    }).compile();

    service = module.get<TaskLedgerService>(TaskLedgerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    const createOpts = {
      tenantId: mockTenantId,
      type: TaskLedgerType.AI_ACTION,
      category: TaskLedgerCategory.BILLING,
      title: 'Send payment reminder',
      description: 'Send reminder for invoice #1234',
      entityType: 'invoice',
      entityId: 'invoice-123',
      actionType: 'SEND_PAYMENT_REMINDER',
      payload: { amount: 100 },
      aiConfidence: 0.95,
    };

    it('should create a new task when idempotency key does not exist', async () => {
      prisma.taskLedgerEntry.findUnique.mockResolvedValue(null);
      prisma.taskLedgerEntry.create.mockResolvedValue(mockTask);

      const result = await service.createTask(createOpts);

      expect(result).toEqual(mockTask);
      expect(prisma.taskLedgerEntry.findUnique).toHaveBeenCalled();
      expect(prisma.taskLedgerEntry.create).toHaveBeenCalled();
      expect(eventsService.emit).toHaveBeenCalled();
    });

    it('should return existing task when idempotency key exists', async () => {
      prisma.taskLedgerEntry.findUnique.mockResolvedValue(mockTask);

      const result = await service.createTask(createOpts);

      expect(result).toEqual(mockTask);
      expect(prisma.taskLedgerEntry.create).not.toHaveBeenCalled();
      expect(eventsService.emit).not.toHaveBeenCalled();
    });

    it('should schedule task when scheduledFor is provided', async () => {
      const scheduledFor = new Date(Date.now() + 60000);
      prisma.taskLedgerEntry.findUnique.mockResolvedValue(null);
      prisma.taskLedgerEntry.create.mockResolvedValue({
        ...mockTask,
        status: 'SCHEDULED',
        scheduledFor,
      });

      await service.createTask({ ...createOpts, scheduledFor });

      expect(queue.add).toHaveBeenCalledWith(
        'execute',
        expect.objectContaining({ taskId: mockTask.id }),
        expect.objectContaining({ delay: expect.any(Number) }),
      );
    });
  });

  describe('getPendingTasks', () => {
    it('should return pending tasks for tenant', async () => {
      const tasks = [mockTask];
      prisma.taskLedgerEntry.findMany.mockResolvedValue(tasks);

      const result = await service.getPendingTasks(mockTenantId);

      expect(result).toEqual(tasks);
      expect(prisma.taskLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should filter by types when provided', async () => {
      prisma.taskLedgerEntry.findMany.mockResolvedValue([]);

      await service.getPendingTasks(mockTenantId, {
        types: [TaskLedgerType.AI_ACTION],
      });

      expect(prisma.taskLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: [TaskLedgerType.AI_ACTION] },
          }),
        }),
      );
    });

    it('should filter by categories when provided', async () => {
      prisma.taskLedgerEntry.findMany.mockResolvedValue([]);

      await service.getPendingTasks(mockTenantId, {
        categories: [TaskLedgerCategory.BILLING],
      });

      expect(prisma.taskLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: [TaskLedgerCategory.BILLING] },
          }),
        }),
      );
    });
  });

  describe('getPendingApprovals', () => {
    it('should return approval tasks', async () => {
      const approvals = [{ ...mockTask, type: TaskLedgerType.APPROVAL }];
      prisma.taskLedgerEntry.findMany.mockResolvedValue(approvals);

      const result = await service.getPendingApprovals(mockTenantId);

      expect(result).toEqual(approvals);
      expect(prisma.taskLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'APPROVAL',
            status: 'PENDING',
          }),
        }),
      );
    });
  });

  describe('getTask', () => {
    it('should return task when found', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(mockTask);

      const result = await service.getTask(mockTaskId, mockTenantId);

      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.getTask(mockTaskId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveTask', () => {
    it('should approve pending task and queue for execution', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(mockTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });

      const result = await service.approveTask(mockTaskId, mockTenantId, mockUserId);

      expect(result.status).toBe('IN_PROGRESS');
      expect(queue.add).toHaveBeenCalledWith(
        'execute',
        expect.objectContaining({
          taskId: mockTaskId,
          tenantId: mockTenantId,
          approvedBy: mockUserId,
        }),
        expect.objectContaining({ priority: 1, jobId: `approved-${mockTaskId}` }),
      );
      expect(eventsService.emit).toHaveBeenCalled();
    });

    it('should remove scheduled job when approving a scheduled task', async () => {
      const scheduledTask = { ...mockTask, status: 'SCHEDULED' };
      const scheduledJob = { remove: jest.fn() };
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(scheduledTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...scheduledTask,
        status: 'IN_PROGRESS',
      });
      queue.getJob.mockResolvedValue(scheduledJob);

      await service.approveTask(mockTaskId, mockTenantId, mockUserId);

      expect(queue.getJob).toHaveBeenCalledWith(mockTaskId);
      expect(scheduledJob.remove).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-pending task', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue({
        ...mockTask,
        status: 'COMPLETED',
      });

      await expect(
        service.approveTask(mockTaskId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('declineTask', () => {
    it('should decline pending task', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(mockTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...mockTask,
        status: 'CANCELLED',
      });

      const result = await service.declineTask(
        mockTaskId,
        mockTenantId,
        mockUserId,
        'Not needed',
      );

      expect(result.status).toBe('CANCELLED');
      expect(eventsService.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-pending task', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });

      await expect(
        service.declineTask(mockTaskId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove job from queue if scheduled', async () => {
      const mockJob = { remove: jest.fn() };
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(mockTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...mockTask,
        status: 'CANCELLED',
      });
      queue.getJob.mockResolvedValue(mockJob);

      await service.declineTask(mockTaskId, mockTenantId, mockUserId);

      expect(queue.getJob).toHaveBeenCalledWith(mockTaskId);
      expect(mockJob.remove).toHaveBeenCalled();
    });
  });

  describe('completeTask', () => {
    it('should complete pending or in-progress task', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(mockTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...mockTask,
        status: 'COMPLETED',
        executedAt: new Date(),
        executedBy: mockUserId,
      });

      const result = await service.completeTask(mockTaskId, mockTenantId, mockUserId);

      expect(result.status).toBe('COMPLETED');
      expect(eventsService.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException for completed task', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue({
        ...mockTask,
        status: 'COMPLETED',
      });

      await expect(
        service.completeTask(mockTaskId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('undoTask', () => {
    it('should undo completed task within window', async () => {
      const completedTask = {
        ...mockTask,
        status: 'COMPLETED',
        undoWindowMins: 5,
        executedAt: new Date(), // Just completed
      };
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(completedTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...completedTask,
        status: 'UNDONE',
        undoneAt: new Date(),
        undoneBy: mockUserId,
      });

      const result = await service.undoTask(mockTaskId, mockTenantId, mockUserId);

      expect(result.status).toBe('UNDONE');
      expect(eventsService.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-completed task', async () => {
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(mockTask);

      await expect(
        service.undoTask(mockTaskId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when undo window expired', async () => {
      const expiredTask = {
        ...mockTask,
        status: 'COMPLETED',
        undoWindowMins: 5,
        executedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      };
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(expiredTask);

      await expect(
        service.undoTask(mockTaskId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when task does not support undo', async () => {
      const noUndoTask = {
        ...mockTask,
        status: 'COMPLETED',
        undoWindowMins: null,
        executedAt: new Date(),
      };
      prisma.taskLedgerEntry.findFirst.mockResolvedValue(noUndoTask);

      await expect(
        service.undoTask(mockTaskId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markFailed', () => {
    it('should mark task as pending for retry when retries available', async () => {
      prisma.taskLedgerEntry.findUnique.mockResolvedValue(mockTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...mockTask,
        status: 'SCHEDULED',
        retryCount: 1,
      });

      const result = await service.markFailed(mockTaskId, 'Error message', true);

      expect(result?.status).toBe('SCHEDULED');
      expect(prisma.taskLedgerEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SCHEDULED',
            retryCount: { increment: 1 },
          }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'execute',
        expect.objectContaining({ taskId: mockTaskId, tenantId: mockTenantId }),
        expect.objectContaining({ delay: expect.any(Number) }),
      );
    });

    it('should mark task as failed when max retries reached', async () => {
      const maxRetriesTask = { ...mockTask, retryCount: 3 };
      prisma.taskLedgerEntry.findUnique.mockResolvedValue(maxRetriesTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...maxRetriesTask,
        status: 'FAILED',
      });

      const result = await service.markFailed(mockTaskId, 'Error message', true);

      expect(result?.status).toBe('FAILED');
    });

    it('should mark task as failed when shouldRetry is false', async () => {
      prisma.taskLedgerEntry.findUnique.mockResolvedValue(mockTask);
      prisma.taskLedgerEntry.update.mockResolvedValue({
        ...mockTask,
        status: 'FAILED',
      });

      await service.markFailed(mockTaskId, 'Error message', false);

      expect(prisma.taskLedgerEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      prisma.taskLedgerEntry.count
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(3)  // approvals
        .mockResolvedValueOnce(10) // completedToday
        .mockResolvedValueOnce(2); // failedToday

      const result = await service.getTaskStats(mockTenantId);

      expect(result).toEqual({
        pending: 5,
        approvals: 3,
        completedToday: 10,
        failedToday: 2,
      });
      expect(prisma.taskLedgerEntry.count).toHaveBeenCalledTimes(4);
    });
  });

  describe('getEntityTasks', () => {
    it('should return tasks for entity', async () => {
      const tasks = [mockTask];
      prisma.taskLedgerEntry.findMany.mockResolvedValue(tasks);

      const result = await service.getEntityTasks(
        mockTenantId,
        'invoice',
        'invoice-123',
      );

      expect(result).toEqual(tasks);
      expect(prisma.taskLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            entityType: 'invoice',
            entityId: 'invoice-123',
          }),
        }),
      );
    });
  });

  describe('cancelEntityTasks', () => {
    it('should cancel all pending tasks for entity', async () => {
      prisma.taskLedgerEntry.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.cancelEntityTasks(
        mockTenantId,
        'invoice',
        'invoice-123',
        'Invoice paid',
      );

      expect(result).toBe(3);
      expect(prisma.taskLedgerEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            entityType: 'invoice',
            entityId: 'invoice-123',
            status: { in: ['PENDING', 'SCHEDULED'] },
          }),
          data: expect.objectContaining({
            status: 'CANCELLED',
            failureReason: 'Invoice paid',
          }),
        }),
      );
    });
  });
});
