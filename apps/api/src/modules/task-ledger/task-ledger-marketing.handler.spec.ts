import { Test, TestingModule } from '@nestjs/testing';
import { TaskLedgerMarketingHandler } from './task-ledger-marketing.handler';
import { PrismaService } from '../../config/prisma/prisma.service';
import { RetentionSequenceService } from '../customer-retention/retention-sequence.service';
import { CampaignsService } from '../marketing/campaigns/campaigns.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TaskLedgerMarketingHandler', () => {
  let handler: TaskLedgerMarketingHandler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let retention: { createSequence: jest.Mock };
  let campaigns: { sendNow: jest.Mock; schedule: jest.Mock };

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    retention = { createSequence: jest.fn() };
    campaigns = { sendNow: jest.fn(), schedule: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerMarketingHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: RetentionSequenceService, useValue: retention },
        { provide: CampaignsService, useValue: campaigns },
      ],
    }).compile();

    handler = module.get<TaskLedgerMarketingHandler>(TaskLedgerMarketingHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates winback sequences for customer ids', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      customerId: 'cust-1',
      payload: { customerIds: ['cust-2'] },
    };

    await handler.handleWinback(payload as any);

    expect(retention.createSequence).toHaveBeenCalledTimes(2);
    expect(retention.createSequence).toHaveBeenCalledWith(
      tenantId,
      'cust-1',
      'DORMANT_WINBACK',
    );
    expect(retention.createSequence).toHaveBeenCalledWith(
      tenantId,
      'cust-2',
      'DORMANT_WINBACK',
    );
  });

  it('creates winback sequences for dormant scope', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'cust-3' }]);

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      payload: { scope: 'dormant_customers', count: 1 },
    };

    await handler.handleWinback(payload as any);

    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: { tenantId, lifecycleStage: 'DORMANT' },
      orderBy: { updatedAt: 'desc' },
      take: 1,
      select: { id: true },
    });
    expect(retention.createSequence).toHaveBeenCalledWith(
      tenantId,
      'cust-3',
      'DORMANT_WINBACK',
    );
  });

  it('sends campaign immediately when no schedule provided', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      campaignId: 'camp-1',
    };

    await handler.handleCampaignSend(payload as any);

    expect(campaigns.sendNow).toHaveBeenCalledWith(tenantId, 'camp-1');
  });
});
