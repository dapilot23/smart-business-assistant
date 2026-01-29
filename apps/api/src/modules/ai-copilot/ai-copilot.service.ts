import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  AiEngineService,
  ToolResult,
  StreamChunk,
} from '../ai-engine/ai-engine.service';
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

export interface CopilotStreamEvent {
  type: 'text' | 'tool_start' | 'tool_end' | 'done' | 'error';
  content?: string;
  toolName?: string;
  conversationId?: string;
  toolsUsed?: string[];
}

const COPILOT_SYSTEM_PROMPT = `You are a helpful business assistant for a home services company.
You have access to tools that can query business data like revenue, appointments, customers, and more.

## CRITICAL RULES FOR ACCURATE RESPONSES

1. **ALWAYS use tools first**: Before answering ANY question about business data, you MUST call the relevant tool to get current data. Never guess or make up numbers.

2. **Only state facts from tool results**: Every number, date, name, or statistic you mention MUST come directly from a tool response in this conversation. Do not invent or estimate data.

3. **Cite your sources**: When presenting data, briefly indicate which tool provided it (e.g., "According to today's revenue data..." or "Based on the customer lookup...").

4. **Admit uncertainty**: If a tool doesn't return the data needed to answer a question, say so clearly:
   - "I don't have data for that time period."
   - "The customer search didn't return any results for that name."
   - "I can only show [available data], not [requested data]."

5. **No fabrication**: NEVER make up customer names, phone numbers, appointment times, revenue figures, or any other specific data. If you don't have it, say so.

6. **Time-bound answers**: Always specify the time period for any data you present (e.g., "this week", "last 30 days", "today").

## RESPONSE FORMAT

- Be concise and focus on actionable insights
- Format numbers as currency when appropriate (e.g., $1,234.56)
- When discussing trends, mention percentage changes
- If data seems incomplete or unusual, note that to the user

## EXAMPLES OF CORRECT BEHAVIOR

User: "What's our revenue this week?"
CORRECT: [Call get_revenue tool first, then] "This week's revenue is $12,450 based on completed jobs."
WRONG: "Your revenue this week is approximately $10,000-15,000." (Never estimate without tool data)

User: "Who is our best customer?"
CORRECT: [Call get_top_customers tool first, then] "Based on total spending, John Smith is your top customer with $5,200 in lifetime value."
WRONG: "Your best customer is probably a returning client who..." (Never speculate)`;

const MAX_TOOL_ITERATIONS = 5;

// Patterns that indicate the response may contain fabricated data
const HALLUCINATION_PATTERNS = [
  /\$[\d,]+\.?\d*/, // Dollar amounts
  /\d+%/, // Percentages
  /\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/, // Times
  /\d+\s+(customers?|appointments?|jobs?|invoices?|quotes?)/, // Counts
];

// Keywords that suggest speculation without data
const SPECULATION_KEYWORDS = [
  'approximately',
  'around',
  'roughly',
  'probably',
  'likely',
  'maybe',
  'I think',
  'I believe',
  'it seems',
  'could be',
  'might be',
  'estimated',
];

/**
 * Check if a response may contain hallucinated data
 * Returns warnings if the response contains numeric claims but no tools were used
 */
function checkForHallucinations(
  response: string,
  toolsUsed: string[],
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // If no tools were used but response contains specific data
  if (toolsUsed.length === 0) {
    const hasNumericClaims = HALLUCINATION_PATTERNS.some((pattern) =>
      pattern.test(response),
    );
    if (hasNumericClaims) {
      warnings.push(
        'Response contains numeric data but no tools were called to retrieve it',
      );
    }
  }

  // Check for speculative language
  const lowerResponse = response.toLowerCase();
  const speculativeTerms = SPECULATION_KEYWORDS.filter((term) =>
    lowerResponse.includes(term.toLowerCase()),
  );
  if (speculativeTerms.length > 0 && toolsUsed.length === 0) {
    warnings.push(
      `Response uses speculative language: ${speculativeTerms.join(', ')}`,
    );
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);
  private readonly isDemoMode: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
    private readonly toolsService: CopilotToolsService,
    private readonly configService: ConfigService,
  ) {
    this.isDemoMode = this.configService.get('DEMO_MODE') === 'true';
  }

  async chat(
    tenantId: string,
    userId: string,
    message: string,
    conversationId?: string,
  ): Promise<CopilotResponse> {
    if (!this.aiEngine.isReady()) {
      // In demo mode, return simulated responses
      if (this.isDemoMode) {
        return this.getDemoResponse(tenantId, userId, message, conversationId);
      }
      return {
        message:
          'AI assistant is currently unavailable. Please configure ANTHROPIC_API_KEY to enable AI features.',
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

    // Validate response for potential hallucinations
    const uniqueToolsUsed = [...new Set(toolsUsed)];
    const validation = checkForHallucinations(finalResponse, uniqueToolsUsed);
    if (!validation.isValid) {
      this.logger.warn('Potential hallucination detected in Copilot response', {
        warnings: validation.warnings,
        toolsUsed: uniqueToolsUsed,
        responsePreview: finalResponse.slice(0, 200),
      });
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
      toolsUsed: uniqueToolsUsed,
      data: Object.keys(collectedData).length > 0 ? collectedData : undefined,
    };
  }

  /**
   * Stream chat responses for real-time UI updates.
   * Yields events as they arrive from the AI engine.
   */
  async *chatStream(
    tenantId: string,
    userId: string,
    message: string,
    conversationId?: string,
  ): AsyncGenerator<CopilotStreamEvent, void, unknown> {
    if (!this.aiEngine.isReady()) {
      yield {
        type: 'error',
        content: 'AI assistant is not configured',
      };
      return;
    }

    const conversation = await this.getOrCreateConversation(
      tenantId,
      userId,
      conversationId,
    );

    const messages = this.buildMessagesFromHistory(conversation);
    messages.push({ role: 'user', content: message });

    const toolsUsed: string[] = [];
    let fullResponse = '';
    let currentToolResults: ToolResult[] | undefined;
    let iterations = 0;
    let needsMoreTools = true;

    while (needsMoreTools && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      needsMoreTools = false;

      const stream = this.aiEngine.streamWithTools({
        messages,
        tools: this.toolsService.getToolDefinitions(),
        toolResults: currentToolResults,
        tenantId,
        feature: 'copilot-stream',
        system: COPILOT_SYSTEM_PROMPT,
      });

      const pendingToolCalls: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
      }> = [];

      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.content) {
          fullResponse += chunk.content;
          yield { type: 'text', content: chunk.content };
        } else if (chunk.type === 'tool_use_start') {
          yield { type: 'tool_start', toolName: chunk.toolName };
        } else if (chunk.type === 'tool_use_end') {
          if (chunk.toolName && chunk.toolId) {
            toolsUsed.push(chunk.toolName);
            pendingToolCalls.push({
              id: chunk.toolId,
              name: chunk.toolName,
              input: chunk.toolInput || {},
            });
          }
          yield { type: 'tool_end', toolName: chunk.toolName };
        } else if (chunk.type === 'error') {
          yield { type: 'error', content: chunk.content };
          return;
        }
      }

      // Execute any pending tool calls
      if (pendingToolCalls.length > 0) {
        needsMoreTools = true;
        currentToolResults = [];

        for (const toolCall of pendingToolCalls) {
          const result = await this.toolsService.executeTool(
            toolCall.name,
            toolCall.input,
            tenantId,
          );
          currentToolResults.push({
            toolUseId: toolCall.id,
            result,
          });
        }

        messages.push({
          role: 'assistant',
          content: `Using tools: ${pendingToolCalls.map((t) => t.name).join(', ')}`,
        });
      }
    }

    // Save conversation
    await this.updateConversation(conversation.id, [
      ...this.parseMessages(conversation.messages),
      { role: 'user', content: message },
      {
        role: 'assistant',
        content: fullResponse || 'Unable to generate response',
        toolCalls: toolsUsed.map((name) => ({ id: '', name, input: {} })),
      },
    ]);

    yield {
      type: 'done',
      conversationId: conversation.id,
      toolsUsed: [...new Set(toolsUsed)],
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

  private async getDemoResponse(
    tenantId: string,
    userId: string,
    message: string,
    conversationId?: string,
  ): Promise<CopilotResponse> {
    const conversation = await this.getOrCreateConversation(
      tenantId,
      userId,
      conversationId,
    );

    const lowerMessage = message.toLowerCase();
    let response: string;

    // Simulate different types of responses based on the question
    if (lowerMessage.includes('revenue') || lowerMessage.includes('money')) {
      response = `**Demo Mode Response**\n\nBased on your business data:\n\n- **Weekly Revenue**: $12,450 (+8% from last week)\n- **Monthly Revenue**: $48,200\n- **Top Service**: Plumbing repairs ($5,200)\n\n*Note: This is simulated data. Configure ANTHROPIC_API_KEY for real AI analysis.*`;
    } else if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
      response = `**Demo Mode Response**\n\nYour appointment overview:\n\n- **Today's Appointments**: 5 scheduled\n- **This Week**: 23 appointments\n- **Completion Rate**: 92%\n- **Next Available Slot**: Tomorrow at 9:00 AM\n\n*Note: This is simulated data. Configure ANTHROPIC_API_KEY for real AI analysis.*`;
    } else if (lowerMessage.includes('customer')) {
      response = `**Demo Mode Response**\n\nCustomer insights:\n\n- **Total Customers**: 247\n- **New This Month**: 12\n- **At-Risk Customers**: 3\n- **Top Customer**: Johnson Family ($2,400 lifetime value)\n\n*Note: This is simulated data. Configure ANTHROPIC_API_KEY for real AI analysis.*`;
    } else if (lowerMessage.includes('how did we do') || lowerMessage.includes('last week')) {
      response = `**Demo Mode Response**\n\n**Weekly Business Summary:**\n\n**Wins:**\n- Revenue up 8% from last week\n- Zero no-shows this week\n- 2 new repeat customers\n\n**Areas for Attention:**\n- 3 quotes pending follow-up\n- 1 customer complaint to address\n\n**Recommendation:** Follow up with pending quotes to improve conversion rate.\n\n*Note: This is simulated data. Configure ANTHROPIC_API_KEY for real AI analysis.*`;
    } else {
      response = `**Demo Mode Response**\n\nI understand you're asking about: "${message}"\n\nIn demo mode, I can provide simulated responses for:\n- Revenue and financial data\n- Appointments and scheduling\n- Customer information\n- Weekly business summaries\n\n*To enable full AI capabilities, configure ANTHROPIC_API_KEY in your environment.*`;
    }

    // Save the conversation
    await this.updateConversation(conversation.id, [
      ...this.parseMessages(conversation.messages),
      { role: 'user', content: message },
      { role: 'assistant', content: response },
    ]);

    return {
      message: response,
      conversationId: conversation.id,
      toolsUsed: [], // Empty in demo mode to avoid leaking internal API structure
    };
  }
}
