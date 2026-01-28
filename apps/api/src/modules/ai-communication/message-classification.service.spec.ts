import { Test, TestingModule } from '@nestjs/testing';
import { MessageClassificationService } from './message-classification.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';
import { MessageIntent, MessageSentiment } from '@prisma/client';

describe('MessageClassificationService', () => {
  let service: MessageClassificationService;
  let prisma: MockPrismaService;
  let mockAiEngine: {
    analyze: jest.Mock;
    isReady: jest.Mock;
  };

  const mockTenantId = 'tenant-123';
  const mockConversationId = 'conv-456';
  const mockMessageId = 'msg-789';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    mockAiEngine = {
      analyze: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageClassificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiEngineService, useValue: mockAiEngine },
      ],
    }).compile();

    service = module.get<MessageClassificationService>(
      MessageClassificationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyMessage', () => {
    it('should classify booking request intent', async () => {
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          intent: 'BOOKING',
          sentiment: 'POSITIVE',
          confidence: 0.92,
          summary: 'Customer wants to book an appointment',
        },
        inputTokens: 50,
        outputTokens: 30,
        latencyMs: 200,
        cached: false,
      });
      prisma.messageClassification.create.mockResolvedValue({
        id: 'class-001',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        messageId: mockMessageId,
        intent: MessageIntent.BOOKING_REQUEST,
        sentiment: MessageSentiment.POSITIVE,
        confidence: 0.92,
        urgencyScore: 30,
        keywords: ['book', 'appointment'],
        suggestedRoute: 'scheduling',
        processedAt: new Date(),
      });

      const result = await service.classifyMessage(
        mockMessageId,
        'I want to book an appointment for next week',
        mockTenantId,
        mockConversationId,
      );

      expect(result.intent).toBe(MessageIntent.BOOKING_REQUEST);
      expect(result.sentiment).toBe(MessageSentiment.POSITIVE);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(mockAiEngine.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'comms.classify-intent',
          tenantId: mockTenantId,
          feature: 'communication',
        }),
      );
    });

    it('should classify complaint with negative sentiment', async () => {
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          intent: 'COMPLAINT',
          sentiment: 'NEGATIVE',
          confidence: 0.88,
          summary: 'Customer is unhappy with service',
        },
        inputTokens: 60,
        outputTokens: 35,
        latencyMs: 180,
        cached: false,
      });
      prisma.messageClassification.create.mockResolvedValue({
        id: 'class-002',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        messageId: mockMessageId,
        intent: MessageIntent.COMPLAINT,
        sentiment: MessageSentiment.NEGATIVE,
        confidence: 0.88,
        urgencyScore: 70,
        keywords: ['unhappy', 'terrible'],
        suggestedRoute: 'support',
        processedAt: new Date(),
      });

      const result = await service.classifyMessage(
        mockMessageId,
        'I am very unhappy with the service I received',
        mockTenantId,
        mockConversationId,
      );

      expect(result.intent).toBe(MessageIntent.COMPLAINT);
      expect(result.sentiment).toBe(MessageSentiment.NEGATIVE);
      expect(result.suggestedRoute).toBe('support');
    });

    it('should detect emergency with high urgency', async () => {
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          intent: 'OTHER',
          sentiment: 'URGENT',
          confidence: 0.95,
          summary: 'Emergency plumbing issue',
        },
        inputTokens: 45,
        outputTokens: 30,
        latencyMs: 150,
        cached: false,
      });
      prisma.messageClassification.create.mockResolvedValue({
        id: 'class-003',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        messageId: mockMessageId,
        intent: MessageIntent.EMERGENCY,
        sentiment: MessageSentiment.URGENT,
        confidence: 0.95,
        urgencyScore: 95,
        keywords: ['emergency', 'urgent', 'flooding'],
        suggestedRoute: 'dispatch',
        processedAt: new Date(),
      });

      const result = await service.classifyMessage(
        mockMessageId,
        'EMERGENCY! My basement is flooding right now!',
        mockTenantId,
        mockConversationId,
      );

      expect(result.intent).toBe(MessageIntent.EMERGENCY);
      expect(result.sentiment).toBe(MessageSentiment.URGENT);
      expect(result.urgencyScore).toBeGreaterThanOrEqual(90);
    });

    it('should store classification in database', async () => {
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          intent: 'PRICING',
          sentiment: 'NEUTRAL',
          confidence: 0.85,
          summary: 'Customer asking about prices',
        },
        inputTokens: 40,
        outputTokens: 28,
        latencyMs: 170,
        cached: false,
      });
      const createdClassification = {
        id: 'class-004',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        messageId: mockMessageId,
        intent: MessageIntent.INQUIRY,
        sentiment: MessageSentiment.NEUTRAL,
        confidence: 0.85,
        urgencyScore: 20,
        keywords: ['price', 'cost'],
        suggestedRoute: 'sales',
        processedAt: new Date(),
      };
      prisma.messageClassification.create.mockResolvedValue(
        createdClassification,
      );

      await service.classifyMessage(
        mockMessageId,
        'How much does a standard cleaning cost?',
        mockTenantId,
        mockConversationId,
      );

      expect(prisma.messageClassification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          conversationId: mockConversationId,
          messageId: mockMessageId,
          intent: MessageIntent.INQUIRY,
          sentiment: MessageSentiment.NEUTRAL,
        }),
      });
    });

    it('should extract relevant keywords', async () => {
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          intent: 'STATUS',
          sentiment: 'NEUTRAL',
          confidence: 0.9,
          summary: 'Checking appointment status',
        },
        inputTokens: 35,
        outputTokens: 25,
        latencyMs: 160,
        cached: false,
      });
      prisma.messageClassification.create.mockResolvedValue({
        id: 'class-005',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        messageId: mockMessageId,
        intent: MessageIntent.FOLLOW_UP,
        sentiment: MessageSentiment.NEUTRAL,
        confidence: 0.9,
        urgencyScore: 25,
        keywords: ['appointment', 'status', 'when'],
        suggestedRoute: 'support',
        processedAt: new Date(),
      });

      const result = await service.classifyMessage(
        mockMessageId,
        'When is my appointment? I need to know the status.',
        mockTenantId,
        mockConversationId,
      );

      expect(result.keywords).toContain('appointment');
      expect(result.keywords).toContain('status');
    });

    it('should suggest appropriate route', async () => {
      mockAiEngine.analyze.mockResolvedValue({
        data: {
          intent: 'BOOKING',
          sentiment: 'POSITIVE',
          confidence: 0.91,
          summary: 'Wants to reschedule',
        },
        inputTokens: 42,
        outputTokens: 27,
        latencyMs: 155,
        cached: false,
      });
      prisma.messageClassification.create.mockResolvedValue({
        id: 'class-006',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        messageId: mockMessageId,
        intent: MessageIntent.RESCHEDULE_REQUEST,
        sentiment: MessageSentiment.POSITIVE,
        confidence: 0.91,
        urgencyScore: 40,
        keywords: ['reschedule', 'different', 'time'],
        suggestedRoute: 'scheduling',
        processedAt: new Date(),
      });

      const result = await service.classifyMessage(
        mockMessageId,
        'Can I reschedule my appointment to a different time?',
        mockTenantId,
        mockConversationId,
      );

      expect(result.suggestedRoute).toBe('scheduling');
    });
  });

  describe('getClassification', () => {
    it('should return stored classification', async () => {
      const storedClassification = {
        id: 'class-010',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        messageId: mockMessageId,
        intent: MessageIntent.INQUIRY,
        sentiment: MessageSentiment.NEUTRAL,
        confidence: 0.87,
        urgencyScore: 15,
        keywords: ['question'],
        suggestedRoute: 'support',
        processedAt: new Date(),
      };
      prisma.messageClassification.findUnique.mockResolvedValue(
        storedClassification,
      );

      const result = await service.getClassification(mockMessageId);

      expect(result).toEqual(storedClassification);
      expect(prisma.messageClassification.findUnique).toHaveBeenCalledWith({
        where: { messageId: mockMessageId },
      });
    });

    it('should return null when classification not found', async () => {
      prisma.messageClassification.findUnique.mockResolvedValue(null);

      const result = await service.getClassification('nonexistent-msg');

      expect(result).toBeNull();
    });
  });

  describe('getConversationClassifications', () => {
    it('should return all classifications for conversation', async () => {
      const classifications = [
        {
          id: 'class-020',
          messageId: 'msg-1',
          intent: MessageIntent.INQUIRY,
          sentiment: MessageSentiment.NEUTRAL,
        },
        {
          id: 'class-021',
          messageId: 'msg-2',
          intent: MessageIntent.BOOKING_REQUEST,
          sentiment: MessageSentiment.POSITIVE,
        },
      ];
      prisma.messageClassification.findMany.mockResolvedValue(classifications);

      const result =
        await service.getConversationClassifications(mockConversationId);

      expect(result).toHaveLength(2);
      expect(prisma.messageClassification.findMany).toHaveBeenCalledWith({
        where: { conversationId: mockConversationId },
        orderBy: { processedAt: 'asc' },
      });
    });
  });

  describe('detectUrgency', () => {
    it('should return high score for emergency keywords', () => {
      const urgency = service.detectUrgency(
        'EMERGENCY! My pipe burst and water is everywhere!',
        MessageSentiment.URGENT,
      );

      expect(urgency).toBeGreaterThanOrEqual(80);
    });

    it('should factor in negative sentiment', () => {
      const urgencyNegative = service.detectUrgency(
        'This is taking too long',
        MessageSentiment.NEGATIVE,
      );
      const urgencyNeutral = service.detectUrgency(
        'This is taking some time',
        MessageSentiment.NEUTRAL,
      );

      expect(urgencyNegative).toBeGreaterThan(urgencyNeutral);
    });

    it('should return low score for routine inquiries', () => {
      const urgency = service.detectUrgency(
        'What are your business hours?',
        MessageSentiment.NEUTRAL,
      );

      expect(urgency).toBeLessThan(30);
    });
  });
});
