import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { AgentType, InsightPriority } from '@prisma/client';
import { BaseAgent, AgentRunContext } from './agents/base-agent';
import { RevenueSalesAgent } from './agents/revenue-sales.agent';
import { CustomerSuccessAgent } from './agents/customer-success.agent';
import { OperationsAgent } from './agents/operations.agent';
import { MarketingAgent } from './agents/marketing.agent';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private readonly agents: Map<AgentType, BaseAgent>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
  ) {
    this.agents = new Map();
    this.agents.set(
      AgentType.REVENUE_SALES,
      new RevenueSalesAgent(prisma, aiEngine),
    );
    this.agents.set(
      AgentType.CUSTOMER_SUCCESS,
      new CustomerSuccessAgent(prisma, aiEngine),
    );
    this.agents.set(
      AgentType.OPERATIONS,
      new OperationsAgent(prisma, aiEngine),
    );
    this.agents.set(
      AgentType.MARKETING,
      new MarketingAgent(prisma, aiEngine),
    );
  }

  async runAgent(
    tenantId: string,
    agentType: AgentType,
    triggeredBy: 'schedule' | 'event' | 'manual',
    triggerEvent?: string,
  ): Promise<string> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    const settings = await this.getSettings(tenantId);
    if (!this.isAgentEnabled(settings, agentType)) {
      this.logger.warn(`Agent ${agentType} is disabled for tenant ${tenantId}`);
      return 'disabled';
    }

    const run = await this.prisma.agentRun.create({
      data: {
        tenantId,
        agentType,
        triggeredBy,
        triggerEvent,
        status: 'RUNNING',
      },
    });

    const startTime = Date.now();

    try {
      const context: AgentRunContext = {
        runId: run.id,
        tenantId,
        triggeredBy,
        triggerEvent,
      };

      const result = await agent.run(context);

      await this.prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          entitiesAnalyzed: result.entitiesAnalyzed,
          insightsGenerated: result.insightsGenerated,
          totalInputTokens: result.inputTokens,
          totalOutputTokens: result.outputTokens,
          costCents: this.calculateCost(result.inputTokens, result.outputTokens),
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Agent ${agentType} completed for tenant ${tenantId}: ` +
        `analyzed ${result.entitiesAnalyzed} entities, ` +
        `generated ${result.insightsGenerated} insights`,
      );

      return run.id;
    } catch (error) {
      await this.prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        },
      });

      this.logger.error(
        `Agent ${agentType} failed for tenant ${tenantId}`,
        error instanceof Error ? error.stack : error,
      );

      throw error;
    }
  }

  async runAllAgents(tenantId: string): Promise<Record<AgentType, string>> {
    const results: Record<string, string> = {};

    for (const agentType of this.agents.keys()) {
      try {
        results[agentType] = await this.runAgent(
          tenantId,
          agentType,
          'manual',
        );
      } catch (error) {
        results[agentType] = 'error';
        this.logger.error(`Failed to run ${agentType}`, error);
      }
    }

    return results as Record<AgentType, string>;
  }

  async getSettings(tenantId: string) {
    let settings = await this.prisma.agentSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      settings = await this.prisma.agentSettings.create({
        data: { tenantId },
      });
    }

    return settings;
  }

  async updateSettings(
    tenantId: string,
    updates: Partial<{
      autopilotMode: string;
      revenueAgentEnabled: boolean;
      customerAgentEnabled: boolean;
      operationsAgentEnabled: boolean;
      marketingAgentEnabled: boolean;
      dashboardNotifications: boolean;
      pushNotifications: boolean;
      pushMinPriority: InsightPriority;
      emailDigestEnabled: boolean;
      emailDigestFrequency: string;
      emailDigestRecipients: string[];
    }>,
  ) {
    return this.prisma.agentSettings.upsert({
      where: { tenantId },
      update: updates as any,
      create: { tenantId, ...updates } as any,
    });
  }

  private isAgentEnabled(
    settings: {
      revenueAgentEnabled: boolean;
      customerAgentEnabled: boolean;
      operationsAgentEnabled: boolean;
      marketingAgentEnabled: boolean;
    },
    agentType: AgentType,
  ): boolean {
    switch (agentType) {
      case AgentType.REVENUE_SALES:
        return settings.revenueAgentEnabled;
      case AgentType.CUSTOMER_SUCCESS:
        return settings.customerAgentEnabled;
      case AgentType.OPERATIONS:
        return settings.operationsAgentEnabled;
      case AgentType.MARKETING:
        return settings.marketingAgentEnabled;
      default:
        return false;
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Sonnet pricing: $3/1M input, $15/1M output
    const inputCost = (inputTokens / 1_000_000) * 3 * 100;
    const outputCost = (outputTokens / 1_000_000) * 15 * 100;
    return Math.ceil(inputCost + outputCost);
  }
}
