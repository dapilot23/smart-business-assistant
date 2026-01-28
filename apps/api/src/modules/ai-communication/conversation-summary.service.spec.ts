import { Test, TestingModule } from '@nestjs/testing';
import { ConversationSummaryService } from './conversation-summary.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';
import { MessageSentiment } from '@prisma/client';

describe('ConversationSummaryService', () => {
  let service: ConversationSummaryService;
  let prisma: MockPrismaService;
  let mockAiEngine: {
    analyze: jest.Mock;
    isReady: jest.Mock;
  };

  const mockTenantId = 'tenant-123';
  const mockConversationId = 'conv-456';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    mockAiEngine = {
      analyze: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationSummaryService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiEngineService, useValue: mockAiEngine },
      ],
    }).compile();

    service = module.get<ConversationSummaryService>(ConversationSummaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('summarizeConversation', () => {
    const mockConversation = {
      id: mockConversationId,
      tenantId: mockTenantId,
      customerName: 'John Doe',
      customerPhone: '+1234567890',
      messages: [
        {
          id: 'msg-1',
          content: 'Hi, I need to book an appointment',
          direction: 'INBOUND',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'msg-2',
          content: 'Sure! When would work for you?',
          direction: 'OUTBOUND',
          createdAt: new Date('2024-01-15T10:05:00Z'),
        },
        {
          id: 'msg-3',
          content: 'How about tomorrow at 2pm?',
          direction: 'INBOUND',
          createdAt: new Date('2024-01-15T10:10:00Z'),
        },
        {
          id: 'msg-4',
          content: 'Perfect! I have scheduled you for 2pm tomorrow.',
          direction: 'OUTBOUND',
          createdAt: new Date('2024-01-15T10:15:00Z'),
        },
      ],
    };

    it('should generate comprehensive summary', async () => {
      prisma.conversationThread.findUnique.mockResolvedValue(mockConversation);
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          summary: 'Customer booked an appointment for tomorrow at 2pm.',
          keyTopics: ['appointment', 'scheduling'],
          actionItems: ['Confirm appointment 24 hours before'],
          customerSentiment: 'POSITIVE',
          followUpNeeded: false,
        },
        inputTokens: 120,
        outputTokens: 50,
        latencyMs: 350,
        cached: false,
      });

      const result = await service.summarizeConversation(
        mockConversationId,
        mockTenantId,
      );

      expect(result.summary).toContain('appointment');
      expect(result.keyPoints).toBeDefined();
      expect(result.messageCount).toBe(4);
      expect(mockAiEngine.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'comms.summarize-conversation',
          tenantId: mockTenantId,
        }),
      );
    });

    it('should identify unresolved issues', async () => {
      const conversationWithIssue = {
        ...mockConversation,
        messages: [
          ...mockConversation.messages,
          {
            id: 'msg-5',
            content: 'Actually, I also have a leak that needs fixing',
            direction: 'INBOUND',
            createdAt: new Date('2024-01-15T10:20:00Z'),
          },
        ],
      };
      prisma.conversationThread.findUnique.mockResolvedValue(conversationWithIssue);
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          summary: 'Customer booked appointment but also mentioned a leak issue.',
          keyTopics: ['appointment', 'leak', 'repair'],
          actionItems: ['Address leak issue', 'Confirm appointment'],
          customerSentiment: 'NEUTRAL',
          followUpNeeded: true,
        },
        inputTokens: 150,
        outputTokens: 60,
        latencyMs: 400,
        cached: false,
      });

      const result = await service.summarizeConversation(
        mockConversationId,
        mockTenantId,
      );

      expect(result.unresolvedIssues).toBeDefined();
      expect(result.unresolvedIssues.length).toBeGreaterThan(0);
    });

    it('should recommend actions', async () => {
      prisma.conversationThread.findUnique.mockResolvedValue(mockConversation);
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          summary: 'Customer booked appointment.',
          keyTopics: ['appointment'],
          actionItems: ['Send confirmation', 'Send reminder before appointment'],
          customerSentiment: 'POSITIVE',
          followUpNeeded: false,
        },
        inputTokens: 100,
        outputTokens: 45,
        latencyMs: 320,
        cached: false,
      });

      const result = await service.summarizeConversation(
        mockConversationId,
        mockTenantId,
      );

      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should calculate overall sentiment', async () => {
      prisma.conversationThread.findUnique.mockResolvedValue(mockConversation);
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          summary: 'Positive interaction with successful booking.',
          keyTopics: ['booking'],
          actionItems: [],
          customerSentiment: 'POSITIVE',
          followUpNeeded: false,
        },
        inputTokens: 90,
        outputTokens: 40,
        latencyMs: 280,
        cached: false,
      });

      const result = await service.summarizeConversation(
        mockConversationId,
        mockTenantId,
      );

      expect(result.customerSentiment).toBe(MessageSentiment.POSITIVE);
    });
  });

  describe('summarizeForHandoff', () => {
    const mockConversation = {
      id: mockConversationId,
      tenantId: mockTenantId,
      customerName: 'Jane Smith',
      messages: [
        { content: 'I have a complaint about my last service', direction: 'INBOUND' },
        { content: 'I apologize, let me look into this', direction: 'OUTBOUND' },
      ],
    };

    it('should generate concise handoff summary', async () => {
      prisma.conversationThread.findUnique.mockResolvedValue(mockConversation);
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          summary: 'Customer complained about last service. Investigation pending.',
          keyTopics: ['complaint', 'service issue'],
          actionItems: ['Review service history', 'Offer resolution'],
          customerSentiment: 'NEGATIVE',
          followUpNeeded: true,
        },
        inputTokens: 80,
        outputTokens: 35,
        latencyMs: 250,
        cached: false,
      });

      const result = await service.summarizeForHandoff(
        mockConversationId,
        mockTenantId,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeLessThan(500); // Concise summary
    });

    it('should include next agent context', async () => {
      prisma.conversationThread.findUnique.mockResolvedValue(mockConversation);
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          summary: 'Customer issue needs supervisor review.',
          keyTopics: ['escalation'],
          actionItems: ['Supervisor review needed'],
          customerSentiment: 'NEGATIVE',
          followUpNeeded: true,
        },
        inputTokens: 85,
        outputTokens: 38,
        latencyMs: 260,
        cached: false,
      });

      const result = await service.summarizeForHandoff(
        mockConversationId,
        mockTenantId,
        'Handle with care - high value customer',
      );

      expect(result).toContain('high value customer');
    });
  });
});
