import { Test, TestingModule } from '@nestjs/testing';
import { ResponseGenerationService } from './response-generation.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';
import { MessageIntent, MessageSentiment } from '@prisma/client';
import { ClassificationResult } from './message-classification.service';

describe('ResponseGenerationService', () => {
  let service: ResponseGenerationService;
  let prisma: MockPrismaService;
  let mockAiEngine: {
    generateText: jest.Mock;
    isReady: jest.Mock;
  };

  const mockTenantId = 'tenant-123';
  const mockConversationId = 'conv-456';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    mockAiEngine = {
      generateText: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseGenerationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiEngineService, useValue: mockAiEngine },
      ],
    }).compile();

    service = module.get<ResponseGenerationService>(ResponseGenerationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResponseSuggestions', () => {
    it('should return multiple suggestions', async () => {
      prisma.conversationThread.findUnique.mockResolvedValue({
        id: mockConversationId,
        tenantId: mockTenantId,
        customerName: 'John Doe',
        messages: [
          { content: 'Hi, I need help booking an appointment', direction: 'INBOUND' },
        ],
      });
      prisma.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Test Business',
      });
      mockAiEngine.generateText.mockResolvedValue({
        data: "Hi John! I'd be happy to help you book an appointment. What day works best for you?",
        inputTokens: 80,
        outputTokens: 25,
        latencyMs: 300,
        cached: false,
      });

      const result = await service.generateResponseSuggestions(
        mockConversationId,
        mockTenantId,
        3,
      );

      expect(result).toHaveLength(3);
      expect(result[0].content).toBeDefined();
      expect(result[0].confidence).toBeGreaterThan(0);
    });

    it('should include different tones', async () => {
      prisma.conversationThread.findUnique.mockResolvedValue({
        id: mockConversationId,
        tenantId: mockTenantId,
        customerName: 'Jane Smith',
        messages: [
          { content: 'When can I get my AC repaired?', direction: 'INBOUND' },
        ],
      });
      prisma.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Cool Air Services',
      });
      mockAiEngine.generateText
        .mockResolvedValueOnce({
          data: 'Hello! We can schedule your AC repair tomorrow.',
          inputTokens: 70,
          outputTokens: 20,
          latencyMs: 280,
          cached: false,
        })
        .mockResolvedValueOnce({
          data: 'Hi there! Happy to help with your AC. When works for you?',
          inputTokens: 70,
          outputTokens: 22,
          latencyMs: 290,
          cached: false,
        })
        .mockResolvedValueOnce({
          data: 'We understand how important AC is. Let me help schedule a repair.',
          inputTokens: 70,
          outputTokens: 24,
          latencyMs: 295,
          cached: false,
        });

      const result = await service.generateResponseSuggestions(
        mockConversationId,
        mockTenantId,
        3,
      );

      const tones = result.map((r) => r.tone);
      expect(tones).toContain('professional');
      expect(tones).toContain('friendly');
      expect(tones).toContain('empathetic');
    });

    it('should use conversation context', async () => {
      prisma.conversationThread.findUnique.mockResolvedValue({
        id: mockConversationId,
        tenantId: mockTenantId,
        customerName: 'Bob Wilson',
        messages: [
          { content: 'I had an appointment yesterday', direction: 'INBOUND' },
          { content: 'We hope the service went well!', direction: 'OUTBOUND' },
          { content: 'Actually I have a follow-up question', direction: 'INBOUND' },
        ],
      });
      prisma.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Handyman Pro',
      });
      mockAiEngine.generateText.mockResolvedValue({
        data: 'Of course, Bob! What would you like to know about your service?',
        inputTokens: 100,
        outputTokens: 28,
        latencyMs: 310,
        cached: false,
      });

      await service.generateResponseSuggestions(mockConversationId, mockTenantId, 1);

      expect(mockAiEngine.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'comms.generate-response',
          variables: expect.objectContaining({
            customerName: 'Bob Wilson',
          }),
        }),
      );
    });
  });

  describe('findMatchingAutoResponder', () => {
    const mockClassification: ClassificationResult = {
      intent: MessageIntent.BOOKING_REQUEST,
      sentiment: MessageSentiment.POSITIVE,
      confidence: 0.9,
      urgencyScore: 30,
      keywords: ['book', 'appointment'],
      suggestedRoute: 'scheduling',
    };

    it('should match by intent', async () => {
      const rules = [
        {
          id: 'rule-1',
          tenantId: mockTenantId,
          name: 'Booking Auto-Reply',
          intent: MessageIntent.BOOKING_REQUEST,
          sentiment: null,
          minUrgency: 0,
          maxUrgency: 100,
          responseTemplate: 'Thanks for your booking request! We will get back to you shortly.',
          isActive: true,
          priority: 10,
        },
      ];
      prisma.autoResponderRule.findMany.mockResolvedValue(rules);

      const result = await service.findMatchingAutoResponder(
        mockClassification,
        mockTenantId,
      );

      expect(result).not.toBeNull();
      expect(result!.rule.name).toBe('Booking Auto-Reply');
    });

    it('should respect priority order', async () => {
      // Rules are returned ordered by priority desc (as the query specifies)
      const rules = [
        {
          id: 'rule-high',
          tenantId: mockTenantId,
          name: 'High Priority',
          intent: MessageIntent.BOOKING_REQUEST,
          sentiment: null,
          minUrgency: 0,
          maxUrgency: 100,
          responseTemplate: 'High priority response',
          isActive: true,
          priority: 20,
        },
        {
          id: 'rule-low',
          tenantId: mockTenantId,
          name: 'Low Priority',
          intent: MessageIntent.BOOKING_REQUEST,
          sentiment: null,
          minUrgency: 0,
          maxUrgency: 100,
          responseTemplate: 'Low priority response',
          isActive: true,
          priority: 5,
        },
      ];
      prisma.autoResponderRule.findMany.mockResolvedValue(rules);

      const result = await service.findMatchingAutoResponder(
        mockClassification,
        mockTenantId,
      );

      expect(result!.rule.name).toBe('High Priority');
    });

    it('should respect urgency range', async () => {
      const rules = [
        {
          id: 'rule-urgent',
          tenantId: mockTenantId,
          name: 'Urgent Only',
          intent: MessageIntent.BOOKING_REQUEST,
          sentiment: null,
          minUrgency: 80,
          maxUrgency: 100,
          responseTemplate: 'Urgent response',
          isActive: true,
          priority: 10,
        },
      ];
      prisma.autoResponderRule.findMany.mockResolvedValue(rules);

      // Classification has urgencyScore of 30, which is outside 80-100 range
      const result = await service.findMatchingAutoResponder(
        mockClassification,
        mockTenantId,
      );

      expect(result).toBeNull();
    });

    it('should return null when no match', async () => {
      prisma.autoResponderRule.findMany.mockResolvedValue([]);

      const result = await service.findMatchingAutoResponder(
        mockClassification,
        mockTenantId,
      );

      expect(result).toBeNull();
    });
  });

  describe('createAutoResponderRule', () => {
    it('should create rule', async () => {
      const ruleData = {
        name: 'New Rule',
        intent: MessageIntent.INQUIRY,
        responseTemplate: 'Auto response for inquiries',
        priority: 5,
      };
      const createdRule = {
        id: 'new-rule-id',
        tenantId: mockTenantId,
        ...ruleData,
        sentiment: null,
        minUrgency: 0,
        maxUrgency: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.autoResponderRule.create.mockResolvedValue(createdRule);

      const result = await service.createAutoResponderRule(ruleData, mockTenantId);

      expect(result.id).toBe('new-rule-id');
      expect(prisma.autoResponderRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          name: 'New Rule',
        }),
      });
    });
  });

  describe('updateAutoResponderRule', () => {
    it('should update rule', async () => {
      const ruleId = 'rule-123';
      const updateData = { name: 'Updated Rule Name', priority: 15 };
      const updatedRule = {
        id: ruleId,
        tenantId: mockTenantId,
        name: 'Updated Rule Name',
        priority: 15,
        intent: MessageIntent.GENERAL,
        sentiment: null,
        minUrgency: 0,
        maxUrgency: 100,
        responseTemplate: 'Some template',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.autoResponderRule.update.mockResolvedValue(updatedRule);

      const result = await service.updateAutoResponderRule(
        ruleId,
        updateData,
        mockTenantId,
      );

      expect(result.name).toBe('Updated Rule Name');
      expect(prisma.autoResponderRule.update).toHaveBeenCalledWith({
        where: { id: ruleId, tenantId: mockTenantId },
        data: updateData,
      });
    });
  });

  describe('deleteAutoResponderRule', () => {
    it('should delete rule', async () => {
      const ruleId = 'rule-to-delete';
      prisma.autoResponderRule.delete.mockResolvedValue({
        id: ruleId,
        tenantId: mockTenantId,
      });

      await service.deleteAutoResponderRule(ruleId, mockTenantId);

      expect(prisma.autoResponderRule.delete).toHaveBeenCalledWith({
        where: { id: ruleId, tenantId: mockTenantId },
      });
    });
  });
});
