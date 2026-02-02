import { Test, TestingModule } from '@nestjs/testing';
import { TaskLedgerMessagingHandler } from './task-ledger-messaging.handler';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { SuggestedResponseService } from '../ai-communication/suggested-response.service';
import { ConversationService } from '../messaging/conversation.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TaskLedgerMessagingHandler', () => {
  let handler: TaskLedgerMessagingHandler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let sms: { sendSms: jest.Mock; sendBulkSms: jest.Mock };
  let suggestedResponses: { acceptSuggestion: jest.Mock };
  let conversations: { getConversation: jest.Mock; sendMessage: jest.Mock };

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    sms = { sendSms: jest.fn(), sendBulkSms: jest.fn() };
    suggestedResponses = { acceptSuggestion: jest.fn() };
    conversations = { getConversation: jest.fn(), sendMessage: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLedgerMessagingHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: SmsService, useValue: sms },
        { provide: SuggestedResponseService, useValue: suggestedResponses },
        { provide: ConversationService, useValue: conversations },
      ],
    }).compile();

    handler = module.get<TaskLedgerMessagingHandler>(TaskLedgerMessagingHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends SMS to direct phone', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      payload: {
        phone: '+15551234567',
        message: 'Hello',
      },
    };

    await handler.handleSms(payload as any);

    expect(sms.sendSms).toHaveBeenCalledWith(
      '+15551234567',
      'Hello',
      { tenantId },
    );
  });

  it('sends bulk SMS when customer ids provided', async () => {
    prisma.customer.findMany.mockResolvedValue([
      { phone: '+15550000001' },
      { phone: '+15550000002' },
    ]);

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      payload: {
        customerIds: ['cust-1', 'cust-2'],
        message: 'Promo',
      },
    };

    await handler.handleSms(payload as any);

    expect(sms.sendBulkSms).toHaveBeenCalledWith(
      ['+15550000001', '+15550000002'],
      'Promo',
      tenantId,
    );
  });

  it('accepts AI response suggestion when suggestionId provided', async () => {
    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      payload: {
        suggestionId: 'suggest-1',
        editedText: 'Edited reply',
      },
    };

    await handler.handleAiResponse(payload as any);

    expect(suggestedResponses.acceptSuggestion).toHaveBeenCalledWith(
      tenantId,
      'suggest-1',
      'Edited reply',
    );
  });

  it('sends AI response via conversation when suggestionId is missing', async () => {
    conversations.getConversation.mockResolvedValue({
      id: 'thread-1',
      channel: 'SMS',
      customerPhone: '+15551230000',
    });

    const payload = {
      tenantId,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      payload: {
        conversationId: 'thread-1',
        message: 'Thanks for reaching out',
      },
    };

    await handler.handleAiResponse(payload as any);

    expect(conversations.sendMessage).toHaveBeenCalledWith(
      tenantId,
      'thread-1',
      { content: 'Thanks for reaching out' },
    );
    expect(sms.sendSms).toHaveBeenCalledWith(
      '+15551230000',
      'Thanks for reaching out',
      { tenantId },
    );
  });
});
