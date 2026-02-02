import { Test, TestingModule } from '@nestjs/testing';
import { TaskLedgerEmailHandler } from './task-ledger-email.handler';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TaskLedgerEmailHandler', () => {
  let handler: TaskLedgerEmailHandler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let email: { sendCustomEmail: jest.Mock };

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    email = { sendCustomEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerEmailHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    handler = module.get<TaskLedgerEmailHandler>(TaskLedgerEmailHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends email to direct recipient', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      payload: {
        email: 'hello@example.com',
        subject: 'Notice',
        message: 'Hello there',
      },
    };

    await handler.handleEmail(payload as any);

    expect(email.sendCustomEmail).toHaveBeenCalledWith({
      to: 'hello@example.com',
      subject: 'Notice',
      html: undefined,
      text: 'Hello there',
      tenantId,
    });
  });

  it('sends email using invoice customer email', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-1',
      customer: { email: 'billing@example.com' },
    });

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      invoiceId: 'inv-1',
      payload: {
        subject: 'Invoice reminder',
        message: 'Please pay your invoice.',
      },
    };

    await handler.handleEmail(payload as any);

    expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
      where: { id: 'inv-1', tenantId },
      include: { customer: true },
    });
    expect(email.sendCustomEmail).toHaveBeenCalledWith({
      to: 'billing@example.com',
      subject: 'Invoice reminder',
      html: undefined,
      text: 'Please pay your invoice.',
      tenantId,
    });
  });
});
