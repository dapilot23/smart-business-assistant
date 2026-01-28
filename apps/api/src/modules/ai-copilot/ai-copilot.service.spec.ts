import { Test, TestingModule } from '@nestjs/testing';
import { AiCopilotService } from './ai-copilot.service';
import { CopilotToolsService } from './copilot-tools.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';

describe('AiCopilotService', () => {
  let service: AiCopilotService;
  let prisma: MockPrismaService;
  let mockAiEngine: {
    generateWithTools: jest.Mock;
    isReady: jest.Mock;
  };
  let mockToolsService: {
    getToolDefinitions: jest.Mock;
    executeTool: jest.Mock;
  };

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    mockAiEngine = {
      generateWithTools: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    };
    mockToolsService = {
      getToolDefinitions: jest.fn().mockReturnValue([
        {
          name: 'get_revenue_summary',
          description: 'Get revenue totals by date range',
          inputSchema: { type: 'object', properties: {} },
        },
      ]),
      executeTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCopilotService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiEngineService, useValue: mockAiEngine },
        { provide: CopilotToolsService, useValue: mockToolsService },
      ],
    }).compile();

    service = module.get<AiCopilotService>(AiCopilotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should process simple question and return response', async () => {
      mockAiEngine.generateWithTools.mockResolvedValue({
        response: 'Based on the data, your revenue this week is $5,000.',
        toolCalls: [],
        inputTokens: 100,
        outputTokens: 30,
        latencyMs: 500,
      });
      prisma.copilotConversation.create.mockResolvedValue({
        id: 'conv-new',
        tenantId: mockTenantId,
        userId: mockUserId,
        messages: [],
      });
      prisma.copilotConversation.update.mockResolvedValue({
        id: 'conv-new',
        tenantId: mockTenantId,
        userId: mockUserId,
        messages: [
          { role: 'user', content: 'How did we do this week?' },
          {
            role: 'assistant',
            content: 'Based on the data, your revenue this week is $5,000.',
          },
        ],
      });

      const result = await service.chat(
        mockTenantId,
        mockUserId,
        'How did we do this week?',
      );

      expect(result.message).toBe(
        'Based on the data, your revenue this week is $5,000.',
      );
      expect(result.conversationId).toBe('conv-new');
    });

    it('should execute tool calls from Claude', async () => {
      mockAiEngine.generateWithTools
        .mockResolvedValueOnce({
          response: null,
          toolCalls: [
            {
              id: 'call-1',
              name: 'get_revenue_summary',
              input: { startDate: '2024-01-01', endDate: '2024-01-07' },
            },
          ],
          inputTokens: 100,
          outputTokens: 20,
          latencyMs: 400,
        })
        .mockResolvedValueOnce({
          response: 'Your revenue for the week was $5,000.',
          toolCalls: [],
          inputTokens: 150,
          outputTokens: 25,
          latencyMs: 300,
        });
      mockToolsService.executeTool.mockResolvedValue({
        total: 5000,
        breakdown: [{ date: '2024-01-01', amount: 5000 }],
      });
      prisma.copilotConversation.create.mockResolvedValue({
        id: 'conv-new',
        tenantId: mockTenantId,
        userId: mockUserId,
        messages: [],
      });
      prisma.copilotConversation.update.mockResolvedValue({
        id: 'conv-new',
      });

      const result = await service.chat(
        mockTenantId,
        mockUserId,
        'What was our revenue last week?',
      );

      expect(mockToolsService.executeTool).toHaveBeenCalledWith(
        'get_revenue_summary',
        { startDate: '2024-01-01', endDate: '2024-01-07' },
        mockTenantId,
      );
      expect(result.toolsUsed).toContain('get_revenue_summary');
    });

    it('should maintain conversation context', async () => {
      const existingConversation = {
        id: 'conv-existing',
        tenantId: mockTenantId,
        userId: mockUserId,
        messages: [
          { role: 'user', content: 'Tell me about revenue' },
          { role: 'assistant', content: 'Revenue is $5,000 this week.' },
        ],
      };
      prisma.copilotConversation.findFirst.mockResolvedValue(
        existingConversation,
      );
      prisma.copilotConversation.update.mockResolvedValue({
        id: 'conv-existing',
      });
      mockAiEngine.generateWithTools.mockResolvedValue({
        response: 'That represents a 10% increase from last week.',
        toolCalls: [],
        inputTokens: 120,
        outputTokens: 20,
        latencyMs: 350,
      });

      await service.chat(
        mockTenantId,
        mockUserId,
        'How does that compare to last week?',
        'conv-existing',
      );

      expect(mockAiEngine.generateWithTools).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'assistant' }),
          ]),
        }),
      );
    });

    it('should create new conversation when none provided', async () => {
      prisma.copilotConversation.create.mockResolvedValue({
        id: 'conv-new',
        tenantId: mockTenantId,
        userId: mockUserId,
        messages: [],
      });
      prisma.copilotConversation.update.mockResolvedValue({
        id: 'conv-new',
      });
      mockAiEngine.generateWithTools.mockResolvedValue({
        response: 'Hello! How can I help you today?',
        toolCalls: [],
        inputTokens: 50,
        outputTokens: 15,
        latencyMs: 200,
      });

      const result = await service.chat(mockTenantId, mockUserId, 'Hello');

      expect(prisma.copilotConversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
        }),
      });
      expect(result.conversationId).toBe('conv-new');
    });

    it('should handle AI unavailable gracefully', async () => {
      mockAiEngine.isReady.mockReturnValue(false);
      prisma.copilotConversation.create.mockResolvedValue({
        id: 'conv-new',
        tenantId: mockTenantId,
        userId: mockUserId,
        messages: [],
      });

      const result = await service.chat(
        mockTenantId,
        mockUserId,
        'What is revenue?',
      );

      expect(result.message).toContain('unavailable');
    });
  });

  describe('getConversation', () => {
    it('should return conversation history', async () => {
      const conversation = {
        id: 'conv-123',
        tenantId: mockTenantId,
        userId: mockUserId,
        messages: [
          { role: 'user', content: 'Question 1' },
          { role: 'assistant', content: 'Answer 1' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.copilotConversation.findFirst.mockResolvedValue(conversation);

      const result = await service.getConversation('conv-123', mockTenantId);

      expect(result).toEqual(conversation);
      expect(prisma.copilotConversation.findFirst).toHaveBeenCalledWith({
        where: { id: 'conv-123', tenantId: mockTenantId },
      });
    });
  });

  describe('listConversations', () => {
    it("should return user's conversations", async () => {
      const conversations = [
        {
          id: 'conv-1',
          tenantId: mockTenantId,
          userId: mockUserId,
          messages: [],
          createdAt: new Date(),
        },
        {
          id: 'conv-2',
          tenantId: mockTenantId,
          userId: mockUserId,
          messages: [],
          createdAt: new Date(),
        },
      ];
      prisma.copilotConversation.findMany.mockResolvedValue(conversations);

      const result = await service.listConversations(mockTenantId, mockUserId);

      expect(result).toHaveLength(2);
      expect(prisma.copilotConversation.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, userId: mockUserId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation', async () => {
      prisma.copilotConversation.delete.mockResolvedValue({
        id: 'conv-to-delete',
      });

      await service.deleteConversation('conv-to-delete', mockTenantId);

      expect(prisma.copilotConversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv-to-delete', tenantId: mockTenantId },
      });
    });
  });
});
