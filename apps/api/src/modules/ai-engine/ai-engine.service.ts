import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiCostTrackerService } from './ai-cost-tracker.service';
import { CacheService, CACHE_TTL } from '../../config/cache/cache.service';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';
import { PROMPT_TEMPLATES } from './prompt-templates';
import { createHash } from 'crypto';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_ANALYSIS_TOKENS = 1024;
const DEFAULT_TEXT_TOKENS = 512;
const DEFAULT_ANALYSIS_TEMP = 0.3;
const DEFAULT_TEXT_TEMP = 0.7;

export interface AiAnalyzeOptions {
  template: string;
  variables: Record<string, unknown>;
  tenantId: string;
  feature: string;
  maxTokens?: number;
  temperature?: number;
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
    const startMs = Date.now();

    try {
      const response = await this.fireClaudeApi({
        maxTokens: opts.maxTokens ?? DEFAULT_ANALYSIS_TOKENS,
        messages: [{ role: 'user' as const, content: prompt }],
        temperature: opts.temperature ?? DEFAULT_ANALYSIS_TEMP,
      });

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

  // --- Private helpers ---

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
  ): Promise<ClaudeApiResponse> {
    return this.claudeBreaker.fire({
      model: CLAUDE_MODEL,
      ...params,
    }) as Promise<ClaudeApiResponse>;
  }

  private async callClaudeApi(
    params: ClaudeApiParams,
  ): Promise<ClaudeApiResponse> {
    return this.anthropic!.messages.create(params as any) as any;
  }

  private buildToolUseMessages(
    messages: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
    toolResults?: ToolResult[],
  ): Array<{ role: string; content: unknown }> {
    const anthropicMessages: Array<{ role: string; content: unknown }> = [];

    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        anthropicMessages.push({ role: msg.role, content: msg.content });
      }
    }

    if (toolResults && toolResults.length > 0) {
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
  ): Promise<ClaudeApiResponse> {
    return this.claudeBreaker.fire({
      model: CLAUDE_MODEL,
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
