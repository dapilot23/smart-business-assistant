import { Test, TestingModule } from '@nestjs/testing';
import { TaskLedgerActionHandler } from './task-ledger-action.handler';
import { PrismaService } from '../../config/prisma/prisma.service';
import { PaymentReminderService } from '../payment-reminders/payment-reminder.service';
import { QuoteFollowupService } from '../quotes/quote-followup.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TaskLedgerActionHandler late fees', () => {
  let handler: TaskLedgerActionHandler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  const tenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerActionHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentReminderService, useValue: { scheduleReminders: jest.fn() } },
        { provide: QuoteFollowupService, useValue: { scheduleFollowUps: jest.fn() } },
      ],
    }).compile();

    handler = module.get<TaskLedgerActionHandler>(TaskLedgerActionHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('applies late fee for provided invoice id', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-5',
      tenantId,
      status: 'OVERDUE',
      lateFeeApplied: false,
      amount: 1000,
      paidAmount: 200,
    });
    prisma.tenantSettings.findUnique.mockResolvedValue({
      lateFeeEnabled: true,
      lateFeePercentage: 10,
    });

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      invoiceId: 'inv-5',
    };

    await handler.handleLateFee(payload as any);

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-5' },
      data: {
        lateFeeApplied: true,
        lateFeeAmount: 80,
        amount: 1080,
      },
    });
  });

  it('applies late fees for overdue scope', async () => {
    prisma.invoice.findMany.mockResolvedValue([{ id: 'inv-10' }]);
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-10',
      tenantId,
      status: 'OVERDUE',
      lateFeeApplied: false,
      amount: 500,
      paidAmount: 0,
    });
    prisma.tenantSettings.findUnique.mockResolvedValue({
      lateFeeEnabled: true,
      lateFeePercentage: 5,
    });

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      payload: {
        scope: 'overdue_invoices',
        count: 1,
      },
    };

    await handler.handleLateFee(payload as any);

    expect(prisma.invoice.findMany).toHaveBeenCalledWith({
      where: { tenantId, status: 'OVERDUE', lateFeeApplied: false },
      orderBy: { dueDate: 'asc' },
      take: 1,
    });
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-10' },
      data: {
        lateFeeApplied: true,
        lateFeeAmount: 25,
        amount: 525,
      },
    });
  });
});
