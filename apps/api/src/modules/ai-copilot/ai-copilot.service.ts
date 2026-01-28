import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService, ToolResult } from '../ai-engine/ai-engine.service';
import { CopilotToolsService } from './copilot-tools.service';
import { CopilotConversation } from '@prisma/client';

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  toolResults?: Array<{ toolUseId: string; result: unknown }>;
}

export interface CopilotResponse {
  message: string;
  conversationId: string;
  toolsUsed: string[];
  data?: Record<string, unknown>;
}

const COPILOT_SYSTEM_PROMPT = `You are a helpful business assistant for a home services company.
You have access to tools that can query business data like revenue, appointments, customers, and more.
Always use the available tools to get accurate data before answering questions.
Be concise and focus on actionable insights.
Format numbers as currency when appropriate (e.g., $1,234.56).
When discussing trends, mention percentage changes.`;

const MAX_TOOL_ITERATIONS = 5;

@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
    private readonly toolsService: CopilotToolsService,
  ) {}

  async chat(
    tenantId: string,
    userId: string,
    message: string,
    conversationId?: string,
  ): Promise<CopilotResponse> {
    if (!this.aiEngine.isReady()) {
      return {
        message:
          'AI assistant is currently unavailable. Please try again later.',
        conversationId: conversationId ?? '',
        toolsUsed: [],
      };
    }

    const conversation = await this.getOrCreateConversation(
      tenantId,
      userId,
      conversationId,
    );

    const messages = this.buildMessagesFromHistory(conversation);
    messages.push({ role: 'user', content: message });

    const toolsUsed: string[] = [];
    let collectedData: Record<string, unknown> = {};
    let finalResponse: string | null = null;
    let currentToolResults: ToolResult[] | undefined;
    let iterations = 0;

    while (!finalResponse && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const result = await this.aiEngine.generateWithTools({
        messages,
        tools: this.toolsService.getToolDefinitions(),
        toolResults: currentToolResults,
        tenantId,
        feature: 'copilot',
        system: COPILOT_SYSTEM_PROMPT,
      });

      if (result.toolCalls.length > 0) {
        const toolResults: ToolResult[] = [];

        for (const toolCall of result.toolCalls) {
          toolsUsed.push(toolCall.name);

          const toolResult = await this.toolsService.executeTool(
            toolCall.name,
            toolCall.input,
            tenantId,
          );

          toolResults.push({
            toolUseId: toolCall.id,
            result: toolResult,
          });

          collectedData[toolCall.name] = toolResult;
        }

        currentToolResults = toolResults;
        messages.push({
          role: 'assistant',
          content: `Using tools: ${result.toolCalls.map((t) => t.name).join(', ')}`,
        });
      } else {
        finalResponse = result.response;
      }
    }

    if (!finalResponse) {
      finalResponse =
        'I was unable to generate a complete response. Please try rephrasing your question.';
    }

    await this.updateConversation(conversation.id, [
      ...this.parseMessages(conversation.messages),
      { role: 'user', content: message },
      {
        role: 'assistant',
        content: finalResponse,
        toolCalls: toolsUsed.map((name) => ({ id: '', name, input: {} })),
      },
    ]);

    return {
      message: finalResponse,
      conversationId: conversation.id,
      toolsUsed: [...new Set(toolsUsed)],
      data: Object.keys(collectedData).length > 0 ? collectedData : undefined,
    };
  }

  async getConversation(
    conversationId: string,
    tenantId: string,
  ): Promise<CopilotConversation | null> {
    return this.prisma.copilotConversation.findFirst({
      where: { id: conversationId, tenantId },
    });
  }

  async listConversations(
    tenantId: string,
    userId: string,
    limit = 20,
  ): Promise<CopilotConversation[]> {
    return this.prisma.copilotConversation.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async deleteConversation(
    conversationId: string,
    tenantId: string,
  ): Promise<void> {
    await this.prisma.copilotConversation.delete({
      where: { id: conversationId, tenantId },
    });
  }

  private async getOrCreateConversation(
    tenantId: string,
    userId: string,
    conversationId?: string,
  ): Promise<CopilotConversation> {
    if (conversationId) {
      const existing = await this.prisma.copilotConversation.findFirst({
        where: { id: conversationId, tenantId, userId },
      });
      if (existing) return existing;
    }

    return this.prisma.copilotConversation.create({
      data: {
        tenantId,
        userId,
        messages: [],
      },
    });
  }

  private async updateConversation(
    conversationId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    await this.prisma.copilotConversation.update({
      where: { id: conversationId },
      data: { messages: messages as any },
    });
  }

  private buildMessagesFromHistory(
    conversation: CopilotConversation,
  ): Array<{ role: 'user' | 'assistant' | 'tool'; content: string }> {
    const stored = this.parseMessages(conversation.messages);
    return stored.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  private parseMessages(messages: unknown): ChatMessage[] {
    if (!Array.isArray(messages)) return [];
    return messages as ChatMessage[];
  }
}
