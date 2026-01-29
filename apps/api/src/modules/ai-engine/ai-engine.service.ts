import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiCostTrackerService } from './ai-cost-tracker.service';
import { AiFallbackService, FallbackResult } from './ai-fallback.service';
import { CacheService, CACHE_TTL } from '../../config/cache/cache.service';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';
import { PROMPT_TEMPLATES } from './prompt-templates';
import { createHash } from 'crypto';

// Multi-model routing: use appropriate model for task complexity
// Haiku: Simple classifications (~$0.25/1M tokens)
// Sonnet: Most analysis tasks (~$3/1M tokens)
// Opus: Customer-facing, complex reasoning (~$15/1M tokens)
const CLAUDE_MODELS = {
  HAIKU: 'claude-3-5-haiku-20241022',
  SONNET: 'claude-sonnet-4-20250514',
  OPUS: 'claude-opus-4-20250514',
} as const;

// Templates routed to cheaper/faster Haiku model
const HAIKU_TEMPLATES = [
  'comms.classify-intent',
  'comms.classify-sentiment',
  'noshow.score-risk-simple',
  'review.classify-sentiment',
];

// Templates requiring premium Opus model (customer-facing, high-stakes)
const OPUS_TEMPLATES = [
  'copilot.answer-question',
  'copilot.weekly-report',
  'copilot.anomaly-detection',
  'comms.generate-response', // Customer-facing auto-responses
];

const DEFAULT_ANALYSIS_TOKENS = 1024;
const DEFAULT_TEXT_TOKENS = 512;
const DEFAULT_ANALYSIS_TEMP = 0.3;
const DEFAULT_TEXT_TEMP = 0.7;

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export interface AiAnalyzeOptions {
  template: string;
  variables: Record<string, unknown>;
  tenantId: string;
  feature: string;
  maxTokens?: number;
  temperature?: number;
  modelOverride?: ModelTier; // Override automatic model selection
}

export interface AiVisionOptions extends AiAnalyzeOptions {
  imageBase64: string;
  imageMediaType: string;
}

export interface AiGenerateTextOptions {
  template: string;
  variables: Record<string, unknown>;
  tenantId: string;
  feature: string;
  tone?: 'friendly' | 'professional' | 'urgent' | 'empathetic';
  maxTokens?: number;
  temperature?: number;
}

export interface AiResponse<T = unknown> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cached: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolUseId: string;
  result: unknown;
}

export interface AiToolUseOptions {
  messages: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>;
  tools: ToolDefinition[];
  toolResults?: ToolResult[];
  previousToolCalls?: ToolCall[]; // Tool calls from previous response (required when sending toolResults)
  tenantId: string;
  feature: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface AiToolUseResponse {
  response: string | null;
  toolCalls: ToolCall[];
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface StreamChunk {
  type: 'text' | 'tool_use_start' | 'tool_use_end' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolId?: string;
  toolInput?: Record<string, unknown>;
  inputTokens?: number;
  outputTokens?: number;
}

@Injectable()
export class AiEngineService {
  private readonly logger = new Logger(AiEngineService.name);
  private readonly anthropic: Anthropic | null = null;
  private readonly configured: boolean;
  private claudeBreaker: { fire: (...args: unknown[]) => Promise<unknown> };

  constructor(
    private readonly configService: ConfigService,
    private readonly costTracker: AiCostTrackerService,
    private readonly cacheService: CacheService,
    private readonly fallbackService: AiFallbackService,
    circuitBreaker: CircuitBreakerService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.configured = !!apiKey && apiKey.length > 0;

    if (this.configured && apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      this.logger.log('AI Engine initialized with Anthropic Claude');
    } else {
      this.logger.warn('AI Engine not configured - ANTHROPIC_API_KEY missing');
    }

    this.claudeBreaker = circuitBreaker.createBreaker(
      'anthropic-claude',
      (params: unknown) => this.callClaudeApi(params as ClaudeApiParams),
      { timeout: 30000, errorThresholdPercentage: 50, resetTimeout: 60000 },
    );
  }

  isReady(): boolean {
    return this.configured;
  }

  async analyze<T = unknown>(opts: AiAnalyzeOptions): Promise<AiResponse<T>> {
    this.ensureConfigured();

    const cacheKey = this.buildCacheKey(opts.template, opts.variables);
    const cached = await this.cacheService.get<AiResponse<T>>(cacheKey);
    if (cached) return cached;

    const prompt = this.interpolateTemplate(opts.template, opts.variables);
    const model = this.selectModel(opts.template, opts.modelOverride);
    const startMs = Date.now();

    this.logger.debug(`Using model ${model} for template ${opts.template}`);

    try {
      const response = await this.fireClaudeApi(
        {
          maxTokens: opts.maxTokens ?? DEFAULT_ANALYSIS_TOKENS,
          messages: [{ role: 'user' as const, content: prompt }],
          temperature: opts.temperature ?? DEFAULT_ANALYSIS_TEMP,
        },
        model,
      );

      const text = this.extractText(response);
      const data = this.parseJsonResponse<T>(text);
      const result = this.buildResponse(data, response, startMs, false);

      await this.trackSuccess(opts, response, startMs);
      await this.cacheService.set(cacheKey, result, CACHE_TTL.LONG);

      return result;
    } catch (error) {
      await this.trackFailure(opts, startMs, error);
      throw error;
    }
  }

  async analyzeWithVision<T = unknown>(
    opts: AiVisionOptions,
  ): Promise<AiResponse<T>> {
    this.ensureConfigured();

    const prompt = this.interpolateTemplate(opts.template, opts.variables);
    const startMs = Date.now();

    try {
      const response = await this.fireClaudeApi({
        maxTokens: opts.maxTokens ?? DEFAULT_ANALYSIS_TOKENS,
        messages: [
          {
            role: 'user' as const,
            content: [
              {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: opts.imageMediaType,
                  data: opts.imageBase64,
                },
              },
              { type: 'text' as const, text: prompt },
            ],
          },
        ],
        temperature: opts.temperature ?? DEFAULT_ANALYSIS_TEMP,
      });

      const text = this.extractText(response);
      const data = this.parseJsonResponse<T>(text);
      const result = this.buildResponse(data, response, startMs, false);

      await this.trackSuccess(opts, response, startMs);
      return result;
    } catch (error) {
      await this.trackFailure(opts, startMs, error);
      throw error;
    }
  }

  async generateText(
    opts: AiGenerateTextOptions,
  ): Promise<AiResponse<string>> {
    this.ensureConfigured();

    const prompt = this.interpolateTemplate(opts.template, opts.variables);
    const system = opts.tone ? this.getToneInstruction(opts.tone) : undefined;
    const startMs = Date.now();

    try {
      const response = await this.fireClaudeApi({
        maxTokens: opts.maxTokens ?? DEFAULT_TEXT_TOKENS,
        messages: [{ role: 'user' as const, content: prompt }],
        temperature: opts.temperature ?? DEFAULT_TEXT_TEMP,
        system,
      });

      const text = this.extractText(response);
      const result = this.buildResponse(text, response, startMs, false);

      await this.trackSuccess(opts, response, startMs);
      return result;
    } catch (error) {
      await this.trackFailure(opts, startMs, error);
      throw error;
    }
  }

  async generateWithTools(opts: AiToolUseOptions): Promise<AiToolUseResponse> {
    this.ensureConfigured();

    const startMs = Date.now();

    try {
      const anthropicMessages = this.buildToolUseMessages(
        opts.messages,
        opts.toolResults,
        opts.previousToolCalls,
      );
      const anthropicTools = opts.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      }));

      const response = await this.fireClaudeApiWithTools({
        maxTokens: opts.maxTokens ?? 2048,
        messages: anthropicMessages,
        tools: anthropicTools,
        temperature: opts.temperature ?? 0.3,
        system: opts.system,
      });

      const textContent = response.content.find(
        (c: { type: string }) => c.type === 'text',
      ) as { type: 'text'; text: string } | undefined;

      const toolUseBlocks = response.content.filter(
        (c: { type: string }) => c.type === 'tool_use',
      ) as Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>;

      const toolCalls: ToolCall[] = toolUseBlocks.map((block) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));

      await this.trackToolUseSuccess(opts, response, startMs);

      return {
        response: textContent?.text ?? null,
        toolCalls,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: Date.now() - startMs,
      };
    } catch (error) {
      await this.trackFailure({ ...opts, template: 'tool-use' }, startMs, error);
      throw error;
    }
  }

  /**
   * Stream responses with tool support for real-time UI updates.
   * Yields chunks as they arrive from the API.
   */
  async *streamWithTools(
    opts: AiToolUseOptions,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    this.ensureConfigured();

    const anthropicMessages = this.buildToolUseMessages(
      opts.messages,
      opts.toolResults,
      opts.previousToolCalls,
    );
    const anthropicTools = opts.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));

    try {
      const stream = this.anthropic!.messages.stream({
        model: CLAUDE_MODELS.OPUS,
        max_tokens: opts.maxTokens ?? 2048,
        messages: anthropicMessages as any,
        tools: anthropicTools as any,
        temperature: opts.temperature ?? 0.3,
        system: opts.system,
      });

      let currentToolName: string | undefined;
      let currentToolId: string | undefined;
      let currentToolInput = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block as any;
          if (block.type === 'tool_use') {
            currentToolName = block.name;
            currentToolId = block.id;
            currentToolInput = '';
            yield {
              type: 'tool_use_start',
              toolName: block.name,
              toolId: block.id,
            };
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta as any;
          if (delta.type === 'text_delta') {
            yield { type: 'text', content: delta.text };
          } else if (delta.type === 'input_json_delta') {
            currentToolInput += delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolName && currentToolId) {
            try {
              const parsedInput = currentToolInput
                ? JSON.parse(currentToolInput)
                : {};
              yield {
                type: 'tool_use_end',
                toolName: currentToolName,
                toolId: currentToolId,
                toolInput: parsedInput,
              };
            } catch {
              yield {
                type: 'tool_use_end',
                toolName: currentToolName,
                toolId: currentToolId,
                toolInput: {},
              };
            }
            currentToolName = undefined;
            currentToolId = undefined;
            currentToolInput = '';
          }
        } else if (event.type === 'message_stop') {
          // Message complete
        }
      }

      const finalMessage = await stream.finalMessage();
      yield {
        type: 'done',
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      };

      // Track usage
      this.costTracker
        .recordUsage({
          tenantId: opts.tenantId,
          feature: opts.feature,
          template: 'tool-use-stream',
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          latencyMs: 0,
          success: true,
        })
        .catch(() => {});
    } catch (error) {
      yield {
        type: 'error',
        content:
          error instanceof Error ? error.message : 'Unknown streaming error',
      };
    }
  }

  /**
   * Analyze with automatic fallback on failure.
   * Returns AI response on success, or fallback response on failure.
   */
  async analyzeWithFallback<T = unknown>(
    opts: AiAnalyzeOptions,
  ): Promise<AiResponse<T> | FallbackResult<T>> {
    try {
      return await this.analyze<T>(opts);
    } catch (error) {
      this.logger.warn(
        `AI analysis failed for ${opts.template}, activating fallback`,
        { error: error instanceof Error ? error.message : 'Unknown error' },
      );
      return this.fallbackService.executeFallback<T>(opts.template, {
        variables: opts.variables,
      });
    }
  }

  /**
   * Generate text with automatic fallback on failure.
   */
  async generateTextWithFallback(
    opts: AiGenerateTextOptions,
  ): Promise<AiResponse<string> | FallbackResult<string>> {
    try {
      return await this.generateText(opts);
    } catch (error) {
      this.logger.warn(
        `AI text generation failed for ${opts.template}, activating fallback`,
        { error: error instanceof Error ? error.message : 'Unknown error' },
      );
      return this.fallbackService.executeFallback<string>(opts.template, {
        variables: opts.variables,
      });
    }
  }

  /**
   * Check if a response is a fallback result
   */
  isFallbackResult<T>(
    response: AiResponse<T> | FallbackResult<T>,
  ): response is FallbackResult<T> {
    return 'fallback' in response && response.fallback === true;
  }

  // --- Private helpers ---

  private selectModel(template: string, override?: ModelTier): string {
    if (override) {
      return CLAUDE_MODELS[override.toUpperCase() as keyof typeof CLAUDE_MODELS];
    }
    if (HAIKU_TEMPLATES.includes(template)) {
      return CLAUDE_MODELS.HAIKU;
    }
    if (OPUS_TEMPLATES.includes(template)) {
      return CLAUDE_MODELS.OPUS;
    }
    return CLAUDE_MODELS.SONNET; // Default for most analysis tasks
  }

  private ensureConfigured(): void {
    if (!this.configured) {
      throw new BadRequestException(
        'AI Engine is not configured. Set ANTHROPIC_API_KEY in environment.',
      );
    }
  }

  private interpolateTemplate(
    templateKey: string,
    variables: Record<string, unknown>,
  ): string {
    const template = PROMPT_TEMPLATES[templateKey] ?? templateKey;
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const value = variables[key];
      if (value === undefined || value === null) return `{${key}}`;
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  }

  private buildCacheKey(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    const sorted = JSON.stringify(variables, Object.keys(variables).sort());
    const hash = createHash('sha256').update(sorted).digest('hex').slice(0, 16);
    return `ai:${template}:${hash}`;
  }

  private async fireClaudeApi(
    params: Omit<ClaudeApiParams, 'model'>,
    model: string = CLAUDE_MODELS.SONNET,
  ): Promise<ClaudeApiResponse> {
    return this.claudeBreaker.fire({
      model,
      ...params,
    }) as Promise<ClaudeApiResponse>;
  }

  private async callClaudeApi(
    params: ClaudeApiParams,
  ): Promise<ClaudeApiResponse> {
    const { maxTokens, ...rest } = params;
    return this.anthropic!.messages.create({
      ...rest,
      max_tokens: maxTokens,
    } as any) as any;
  }

  private buildToolUseMessages(
    messages: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
    toolResults?: ToolResult[],
    previousToolCalls?: ToolCall[],
  ): Array<{ role: string; content: unknown }> {
    const anthropicMessages: Array<{ role: string; content: unknown }> = [];

    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        anthropicMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // When we have tool results, we must include the assistant message with tool_use blocks
    // followed by a user message with tool_result blocks
    if (toolResults && toolResults.length > 0 && previousToolCalls && previousToolCalls.length > 0) {
      // Add assistant message with tool_use blocks
      anthropicMessages.push({
        role: 'assistant',
        content: previousToolCalls.map((tc) => ({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.input,
        })),
      });

      // Add user message with tool_result blocks
      anthropicMessages.push({
        role: 'user',
        content: toolResults.map((tr) => ({
          type: 'tool_result',
          tool_use_id: tr.toolUseId,
          content: JSON.stringify(tr.result),
        })),
      });
    }

    return anthropicMessages;
  }

  private async fireClaudeApiWithTools(
    params: Omit<ClaudeApiParamsWithTools, 'model'>,
    model: string = CLAUDE_MODELS.SONNET,
  ): Promise<ClaudeApiResponse> {
    return this.claudeBreaker.fire({
      model,
      ...params,
    }) as Promise<ClaudeApiResponse>;
  }

  private async trackToolUseSuccess(
    opts: { tenantId: string; feature: string },
    response: ClaudeApiResponse,
    startMs: number,
  ): Promise<void> {
    this.costTracker
      .recordUsage({
        tenantId: opts.tenantId,
        feature: opts.feature,
        template: 'tool-use',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: Date.now() - startMs,
        success: true,
      })
      .catch((err) =>
        this.logger.error(`Cost tracking failed: ${err.message}`),
      );
  }

  private extractText(response: ClaudeApiResponse): string {
    const block = response.content.find(
      (c: { type: string }) => c.type === 'text',
    );
    return (block as { type: 'text'; text: string })?.text ?? '';
  }

  private parseJsonResponse<T>(text: string): T {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No JSON found in AI response: ${text.slice(0, 100)}`);
    }
    return JSON.parse(jsonMatch[0]) as T;
  }

  private buildResponse<T>(
    data: T,
    response: ClaudeApiResponse,
    startMs: number,
    cached: boolean,
  ): AiResponse<T> {
    return {
      data,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: Date.now() - startMs,
      cached,
    };
  }

  private getToneInstruction(
    tone: 'friendly' | 'professional' | 'urgent' | 'empathetic',
  ): string {
    const tones: Record<string, string> = {
      friendly: 'Write in a warm, friendly, conversational tone.',
      professional: 'Write in a clear, professional business tone.',
      urgent: 'Write with a sense of urgency while remaining respectful.',
      empathetic: 'Write with empathy and understanding for the customer.',
    };
    return tones[tone] ?? tones.professional;
  }

  private async trackSuccess(
    opts: { tenantId: string; feature: string; template: string },
    response: ClaudeApiResponse,
    startMs: number,
  ): Promise<void> {
    this.costTracker
      .recordUsage({
        tenantId: opts.tenantId,
        feature: opts.feature,
        template: opts.template,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: Date.now() - startMs,
        success: true,
      })
      .catch((err) =>
        this.logger.error(`Cost tracking failed: ${err.message}`),
      );
  }

  private async trackFailure(
    opts: { tenantId: string; feature: string; template: string },
    startMs: number,
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    this.costTracker
      .recordUsage({
        tenantId: opts.tenantId,
        feature: opts.feature,
        template: opts.template,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startMs,
        success: false,
        errorMessage: message,
      })
      .catch((err) =>
        this.logger.error(`Cost tracking failed: ${err.message}`),
      );
  }
}

// Internal types for the Claude API interaction
interface ClaudeApiParams {
  model: string;
  maxTokens: number;
  messages: Array<{ role: string; content: unknown }>;
  temperature?: number;
  system?: string;
}

interface ClaudeApiResponse {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

interface ClaudeApiParamsWithTools extends ClaudeApiParams {
  tools: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
}
