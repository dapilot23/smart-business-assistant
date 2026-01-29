import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AiEngineService } from './ai-engine.service';
import { AiCostTrackerService } from './ai-cost-tracker.service';
import { AiFallbackService } from './ai-fallback.service';
import { CacheService } from '../../config/cache/cache.service';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';

// Mock fallback service
const mockFallbackService = {
  getFallback: jest.fn().mockReturnValue({ behavior: 'USE_DEFAULT', defaultData: {} }),
  executeFallback: jest.fn().mockReturnValue({ fallback: true, behavior: 'USE_DEFAULT', data: null }),
  hasFallback: jest.fn().mockReturnValue(true),
};

// Mock the Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

describe('AiEngineService', () => {
  let service: AiEngineService;
  let costTracker: jest.Mocked<AiCostTrackerService>;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;

  const mockResponse = {
    content: [{ type: 'text', text: '{"score": 0.85, "reason": "test"}' }],
    usage: { input_tokens: 500, output_tokens: 200 },
    model: 'claude-sonnet-4-20250514',
    id: 'msg_test',
    role: 'assistant',
    type: 'message',
    stop_reason: 'end_turn',
  };

  const mockTextResponse = {
    content: [{ type: 'text', text: 'Hi Sarah, checking in about your quote.' }],
    usage: { input_tokens: 300, output_tokens: 50 },
    model: 'claude-sonnet-4-20250514',
    id: 'msg_text',
    role: 'assistant',
    type: 'message',
    stop_reason: 'end_turn',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    } as any;

    costTracker = {
      recordUsage: jest.fn().mockResolvedValue(undefined),
      calculateCostCents: jest.fn().mockReturnValue(5),
    } as any;

    cacheService = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    } as any;

    const mockBreaker = {
      fire: jest.fn().mockImplementation((...args: unknown[]) => {
        // The breaker wraps callClaudeApi; simulate calling it directly
        return mockCreate(...(args as [any]));
      }),
    };

    const circuitBreaker = {
      createBreaker: jest.fn().mockReturnValue(mockBreaker),
      getBreaker: jest.fn(),
      getStats: jest.fn(),
      getAllStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiEngineService,
        { provide: ConfigService, useValue: configService },
        { provide: AiCostTrackerService, useValue: costTracker },
        { provide: CacheService, useValue: cacheService },
        { provide: AiFallbackService, useValue: mockFallbackService },
        { provide: CircuitBreakerService, useValue: circuitBreaker },
      ],
    }).compile();

    service = module.get<AiEngineService>(AiEngineService);
  });

  describe('constructor', () => {
    it('should initialize when API key is provided', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should set isReady=false when API key is missing', async () => {
      configService.get.mockReturnValue(undefined);

      const module = await Test.createTestingModule({
        providers: [
          AiEngineService,
          { provide: ConfigService, useValue: configService },
          { provide: AiCostTrackerService, useValue: costTracker },
          { provide: CacheService, useValue: cacheService },
          { provide: AiFallbackService, useValue: mockFallbackService },
          {
            provide: CircuitBreakerService,
            useValue: { createBreaker: jest.fn().mockReturnValue({ fire: jest.fn() }) },
          },
        ],
      }).compile();

      const svc = module.get<AiEngineService>(AiEngineService);
      expect(svc.isReady()).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should call Claude API and parse JSON response', async () => {
      mockCreate.mockResolvedValue(mockResponse);

      const result = await service.analyze<{ score: number }>({
        template: 'quote.score-conversion',
        variables: { quoteAmount: '$500' },
        tenantId: 'tenant-1',
        feature: 'quote-scoring',
      });

      expect(result.data).toEqual({ score: 0.85, reason: 'test' });
      expect(result.inputTokens).toBe(500);
      expect(result.outputTokens).toBe(200);
      expect(result.cached).toBe(false);
    });

    it('should return cached result when cache hit', async () => {
      const cached = {
        data: { score: 0.9 },
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 0,
        cached: true,
      };
      cacheService.get.mockResolvedValue(cached);

      const result = await service.analyze({
        template: 'quote.score-conversion',
        variables: { quoteAmount: '$500' },
        tenantId: 'tenant-1',
        feature: 'quote-scoring',
      });

      expect(result.cached).toBe(true);
      expect(result.data).toEqual({ score: 0.9 });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should cache successful results', async () => {
      mockCreate.mockResolvedValue(mockResponse);

      await service.analyze({
        template: 'quote.score-conversion',
        variables: { quoteAmount: '$500' },
        tenantId: 'tenant-1',
        feature: 'quote-scoring',
      });

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('ai:'),
        expect.objectContaining({ data: { score: 0.85, reason: 'test' } }),
        expect.any(Number),
      );
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const wrappedResponse = {
        ...mockResponse,
        content: [
          { type: 'text', text: '```json\n{"score": 0.75}\n```' },
        ],
      };
      mockCreate.mockResolvedValue(wrappedResponse);

      const result = await service.analyze<{ score: number }>({
        template: 'quote.score-conversion',
        variables: {},
        tenantId: 'tenant-1',
        feature: 'test',
      });

      expect(result.data).toEqual({ score: 0.75 });
    });

    it('should track cost via AiCostTrackerService on success', async () => {
      mockCreate.mockResolvedValue(mockResponse);

      await service.analyze({
        template: 'quote.score-conversion',
        variables: {},
        tenantId: 'tenant-1',
        feature: 'quote-scoring',
      });

      expect(costTracker.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          feature: 'quote-scoring',
          template: 'quote.score-conversion',
          inputTokens: 500,
          outputTokens: 200,
          success: true,
        }),
      );
    });

    it('should track cost with success=false on API error', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(
        service.analyze({
          template: 'quote.score-conversion',
          variables: {},
          tenantId: 'tenant-1',
          feature: 'quote-scoring',
        }),
      ).rejects.toThrow();

      expect(costTracker.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'API error',
        }),
      );
    });

    it('should throw when not configured', async () => {
      configService.get.mockReturnValue(undefined);

      const module = await Test.createTestingModule({
        providers: [
          AiEngineService,
          { provide: ConfigService, useValue: configService },
          { provide: AiCostTrackerService, useValue: costTracker },
          { provide: CacheService, useValue: cacheService },
          { provide: AiFallbackService, useValue: mockFallbackService },
          {
            provide: CircuitBreakerService,
            useValue: { createBreaker: jest.fn().mockReturnValue({ fire: jest.fn() }) },
          },
        ],
      }).compile();

      const svc = module.get<AiEngineService>(AiEngineService);

      await expect(
        svc.analyze({
          template: 'quote.score-conversion',
          variables: {},
          tenantId: 'tenant-1',
          feature: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should interpolate template variables', async () => {
      mockCreate.mockResolvedValue(mockResponse);

      await service.analyze({
        template: 'quote.score-conversion',
        variables: { quoteAmount: '$500', serviceType: 'HVAC Repair' },
        tenantId: 'tenant-1',
        feature: 'test',
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const messageContent = callArgs.messages[0].content;
      expect(messageContent).toContain('$500');
      expect(messageContent).toContain('HVAC Repair');
    });
  });

  describe('analyzeWithVision', () => {
    it('should include image content block in message', async () => {
      mockCreate.mockResolvedValue(mockResponse);

      await service.analyzeWithVision({
        template: 'quote.score-conversion',
        variables: {},
        imageBase64: 'base64data',
        imageMediaType: 'image/jpeg',
        tenantId: 'tenant-1',
        feature: 'photo-quotes',
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const content = callArgs.messages[0].content;
      expect(content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'image',
            source: expect.objectContaining({
              type: 'base64',
              data: 'base64data',
            }),
          }),
        ]),
      );
    });

    it('should NOT cache vision results', async () => {
      mockCreate.mockResolvedValue(mockResponse);

      await service.analyzeWithVision({
        template: 'quote.score-conversion',
        variables: {},
        imageBase64: 'data',
        imageMediaType: 'image/png',
        tenantId: 'tenant-1',
        feature: 'photo-quotes',
      });

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should track cost on success', async () => {
      mockCreate.mockResolvedValue(mockResponse);

      await service.analyzeWithVision({
        template: 'quote.score-conversion',
        variables: {},
        imageBase64: 'data',
        imageMediaType: 'image/jpeg',
        tenantId: 'tenant-1',
        feature: 'photo-quotes',
      });

      expect(costTracker.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'photo-quotes',
          success: true,
        }),
      );
    });
  });

  describe('generateText', () => {
    it('should return raw text (not JSON)', async () => {
      mockCreate.mockResolvedValue(mockTextResponse);

      const result = await service.generateText({
        template: 'quote.generate-followup',
        variables: { customerName: 'Sarah' },
        tenantId: 'tenant-1',
        feature: 'quote-followup',
      });

      expect(result.data).toBe('Hi Sarah, checking in about your quote.');
      expect(typeof result.data).toBe('string');
    });

    it('should NOT cache generated text', async () => {
      mockCreate.mockResolvedValue(mockTextResponse);

      await service.generateText({
        template: 'quote.generate-followup',
        variables: {},
        tenantId: 'tenant-1',
        feature: 'quote-followup',
      });

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should apply tone instruction when specified', async () => {
      mockCreate.mockResolvedValue(mockTextResponse);

      await service.generateText({
        template: 'quote.generate-followup',
        variables: {},
        tenantId: 'tenant-1',
        feature: 'test',
        tone: 'urgent',
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain('urgency');
    });

    it('should track cost on success', async () => {
      mockCreate.mockResolvedValue(mockTextResponse);

      await service.generateText({
        template: 'quote.generate-followup',
        variables: {},
        tenantId: 'tenant-1',
        feature: 'quote-followup',
      });

      expect(costTracker.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'quote-followup',
          success: true,
          inputTokens: 300,
          outputTokens: 50,
        }),
      );
    });
  });
});
