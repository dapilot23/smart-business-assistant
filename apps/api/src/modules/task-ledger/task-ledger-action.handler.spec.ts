import { Test, TestingModule } from '@nestjs/testing';
import { TaskLedgerActionHandler } from './task-ledger-action.handler';
import { PrismaService } from '../../config/prisma/prisma.service';
import { PaymentReminderService } from '../payment-reminders/payment-reminder.service';
import { QuoteFollowupService } from '../quotes/quote-followup.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TaskLedgerActionHandler', () => {
  let handler: TaskLedgerActionHandler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let paymentReminders: { scheduleReminders: jest.Mock };
  let quoteFollowups: { scheduleFollowUps: jest.Mock };

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    paymentReminders = {
      scheduleReminders: jest.fn(),
    };
    quoteFollowups = {
      scheduleFollowUps: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerActionHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentReminderService, useValue: paymentReminders },
        { provide: QuoteFollowupService, useValue: quoteFollowups },
      ],
    }).compile();

    handler = module.get<TaskLedgerActionHandler>(TaskLedgerActionHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('schedules reminders for provided invoice ids', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      invoiceId: 'inv-1',
      entityId: 'inv-2',
      payload: {
        invoiceIds: ['inv-1', 'inv-3'],
      },
    };

    await handler.handlePaymentReminder(payload as any);

    expect(paymentReminders.scheduleReminders).toHaveBeenCalledTimes(3);
    expect(paymentReminders.scheduleReminders).toHaveBeenCalledWith(
      'inv-2',
      tenantId,
    );
    expect(paymentReminders.scheduleReminders).toHaveBeenCalledWith(
      'inv-1',
      tenantId,
    );
    expect(paymentReminders.scheduleReminders).toHaveBeenCalledWith(
      'inv-3',
      tenantId,
    );
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });

  it('schedules overdue invoice reminders when scope is provided', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      { id: 'inv-10' },
      { id: 'inv-11' },
    ]);

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      payload: {
        scope: 'overdue_invoices',
        count: 2,
      },
    };

    await handler.handlePaymentReminder(payload as any);

    expect(prisma.invoice.findMany).toHaveBeenCalledWith({
      where: { tenantId, status: 'OVERDUE' },
      orderBy: { dueDate: 'asc' },
      take: 2,
    });
    expect(paymentReminders.scheduleReminders).toHaveBeenCalledTimes(2);
    expect(paymentReminders.scheduleReminders).toHaveBeenCalledWith(
      'inv-10',
      tenantId,
    );
    expect(paymentReminders.scheduleReminders).toHaveBeenCalledWith(
      'inv-11',
      tenantId,
    );
  });

  it('schedules quote followups for provided quote ids', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      quoteId: 'quote-1',
      entityId: 'quote-2',
      payload: {
        quoteIds: ['quote-1', 'quote-3'],
      },
    };

    await handler.handleQuoteFollowup(payload as any);

    expect(quoteFollowups.scheduleFollowUps).toHaveBeenCalledTimes(3);
    expect(quoteFollowups.scheduleFollowUps).toHaveBeenCalledWith(
      tenantId,
      'quote-2',
    );
    expect(quoteFollowups.scheduleFollowUps).toHaveBeenCalledWith(
      tenantId,
      'quote-1',
    );
    expect(quoteFollowups.scheduleFollowUps).toHaveBeenCalledWith(
      tenantId,
      'quote-3',
    );
    expect(prisma.quote.findMany).not.toHaveBeenCalled();
  });

  it('schedules pending quote followups when scope is provided', async () => {
    const now = new Date('2024-03-10T12:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    prisma.quote.findMany.mockResolvedValue([
      { id: 'quote-10' },
      { id: 'quote-11' },
    ]);

    const payload = {
      tenantId,
      timestamp: now,
      payload: {
        scope: 'pending_quotes',
        count: 2,
      },
    };

    await handler.handleQuoteFollowup(payload as any);

    const expectedCutoff = new Date(
      now.getTime() - 3 * 24 * 60 * 60 * 1000,
    );
    const callArgs = prisma.quote.findMany.mock.calls[0][0];

    expect(callArgs.where).toEqual(
      expect.objectContaining({
        tenantId,
        status: 'SENT',
      }),
    );
    expect(callArgs.where.createdAt.lt.getTime()).toBe(
      expectedCutoff.getTime(),
    );
    expect(callArgs.orderBy).toEqual({ createdAt: 'asc' });
    expect(callArgs.take).toBe(2);

    expect(quoteFollowups.scheduleFollowUps).toHaveBeenCalledTimes(2);
    expect(quoteFollowups.scheduleFollowUps).toHaveBeenCalledWith(
      tenantId,
      'quote-10',
    );
    expect(quoteFollowups.scheduleFollowUps).toHaveBeenCalledWith(
      tenantId,
      'quote-11',
    );
  });
});
