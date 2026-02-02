import { Test, TestingModule } from '@nestjs/testing';
import type { TaskLedgerEntry } from '@prisma/client';
import { CommandCenterService } from './command-center.service';
import { DashboardCacheService } from './dashboard-cache.service';
import { TaskLedgerService } from '../task-ledger/task-ledger.service';
import { SignalType } from './types';

const createTaskLedgerEntry = (
  overrides: Partial<TaskLedgerEntry> = {},
): TaskLedgerEntry => {
  const now = new Date();
  return {
    id: 'task-1',
    tenantId: 'tenant-123',
    type: 'APPROVAL',
    category: 'BILLING',
    status: 'PENDING',
    priority: 50,
    title: 'Approve payment reminder',
    description: null,
    icon: null,
    entityType: null,
    entityId: null,
    actionType: null,
    actionEndpoint: null,
    payload: null,
    idempotencyKey: 'idempotency-1',
    traceId: 'trace-1',
    scheduledFor: null,
    undoWindowMins: null,
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
    aiConfidence: null,
    aiReasoning: null,
    aiModel: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as TaskLedgerEntry;
};

describe('CommandCenterService', () => {
  let service: CommandCenterService;
  let dashboardCache: { getDashboardData: jest.Mock; refreshDashboardData: jest.Mock };
  let taskLedger: { getPendingApprovals: jest.Mock; getPendingTasks: jest.Mock };

  const mockTenantId = 'tenant-123';

  const mockCache = {
    statusBar: {
      greeting: 'Good morning',
      todayAppointments: 3,
      outstandingAmount: 1200,
      businessPulseScore: 78,
      trend: 'stable' as const,
    },
    taskStats: {
      pending: 4,
      approvals: 2,
      completedToday: 7,
      failedToday: 1,
    },
    metrics: {
      todayRevenue: 500,
      todayRevenueTarget: 1000,
      weekAppointments: 12,
      weekRevenue: 2400,
      overdueInvoicesCount: 1,
      overdueInvoicesAmount: 300,
      unconfirmedAppointments: 2,
      pendingQuotesCount: 3,
      pendingQuotesAmount: 1500,
    },
    signals: [
      {
        id: 'signal-1',
        type: SignalType.WARNING,
        icon: 'calendar-alert',
        title: 'Unconfirmed appointments',
        detail: '2 appointments today not confirmed',
        priority: 'high' as const,
        createdAt: new Date(),
      },
    ],
    cachedAt: new Date(),
  };

  beforeEach(async () => {
    dashboardCache = {
      getDashboardData: jest.fn().mockResolvedValue(mockCache),
      refreshDashboardData: jest.fn().mockResolvedValue(mockCache),
    };
    taskLedger = {
      getPendingApprovals: jest.fn().mockResolvedValue([
        createTaskLedgerEntry(),
      ]),
      getPendingTasks: jest.fn().mockResolvedValue([
        createTaskLedgerEntry({
          id: 'task-2',
          type: 'HUMAN_TASK',
          status: 'PENDING',
          title: 'Call customer back',
        }),
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandCenterService,
        { provide: DashboardCacheService, useValue: dashboardCache },
        { provide: TaskLedgerService, useValue: taskLedger },
      ],
    }).compile();

    service = module.get<CommandCenterService>(CommandCenterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should assemble command center dashboard data', async () => {
    const result = await service.getDashboard(mockTenantId, {
      approvalsLimit: 2,
      tasksLimit: 4,
    });

    expect(dashboardCache.getDashboardData).toHaveBeenCalledWith(mockTenantId);
    expect(taskLedger.getPendingApprovals).toHaveBeenCalledWith(mockTenantId, 2);
    expect(taskLedger.getPendingTasks).toHaveBeenCalledWith(
      mockTenantId,
      expect.objectContaining({ limit: 4 }),
    );
    expect(result.statusBar).toEqual(mockCache.statusBar);
    expect(result.taskStats).toEqual(mockCache.taskStats);
    expect(result.metrics).toEqual(mockCache.metrics);
    expect(result.approvals).toHaveLength(1);
    expect(result.tasks).toHaveLength(1);
    expect(result.signals).toEqual(mockCache.signals);
    expect(result.oneTapWin).toBeDefined();
    expect(result.oneTapWin?.id).toBe('win-overdue-invoices');
    expect(result.quickActions.length).toBeGreaterThan(0);
  });

  it('should refresh dashboard data before rebuilding the response', async () => {
    await service.refreshDashboard(mockTenantId);

    expect(dashboardCache.refreshDashboardData).toHaveBeenCalledWith(mockTenantId);
    expect(dashboardCache.getDashboardData).toHaveBeenCalledWith(mockTenantId);
  });
});
