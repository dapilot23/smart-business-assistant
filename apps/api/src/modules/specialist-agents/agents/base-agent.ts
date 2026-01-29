import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { AiEngineService } from '../../ai-engine/ai-engine.service';
import { AgentType, InsightPriority, InsightStatus } from '@prisma/client';

export interface AgentInsightInput {
  entityType: string;
  entityId: string;
  insightType: string;
  title: string;
  description: string;
  confidenceScore: number;
  impactScore: number;
  priority: InsightPriority;
  recommendedAction: string;
  actionParams?: Record<string, unknown>;
  actionLabel: string;
  expiresAt?: Date;
  aiReasoning?: string;
}

export interface AgentRunContext {
  runId: string;
  tenantId: string;
  triggeredBy: 'schedule' | 'event' | 'manual';
  triggerEvent?: string;
}

export interface AgentRunResult {
  entitiesAnalyzed: number;
  insightsGenerated: number;
  inputTokens: number;
  outputTokens: number;
}

export abstract class BaseAgent {
  protected readonly logger: Logger;
  protected inputTokens = 0;
  protected outputTokens = 0;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly aiEngine: AiEngineService,
    protected readonly agentType: AgentType,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  abstract getName(): string;
  abstract getDescription(): string;

  async run(context: AgentRunContext): Promise<AgentRunResult> {
    this.logger.log(`Starting ${this.getName()} for tenant ${context.tenantId}`);
    this.inputTokens = 0;
    this.outputTokens = 0;

    const entities = await this.fetchEntities(context.tenantId);
    this.logger.debug(`Found ${entities.length} entities to analyze`);

    const insights: AgentInsightInput[] = [];

    for (const entity of entities) {
      const entityInsights = await this.analyzeEntity(entity, context);
      insights.push(...entityInsights);
    }

    await this.saveInsights(insights, context);

    return {
      entitiesAnalyzed: entities.length,
      insightsGenerated: insights.length,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    };
  }

  protected abstract fetchEntities(tenantId: string): Promise<unknown[]>;

  protected abstract analyzeEntity(
    entity: unknown,
    context: AgentRunContext,
  ): Promise<AgentInsightInput[]>;

  protected async saveInsights(
    insights: AgentInsightInput[],
    context: AgentRunContext,
  ): Promise<void> {
    for (const insight of insights) {
      await this.prisma.agentInsight.create({
        data: {
          tenantId: context.tenantId,
          agentType: this.agentType,
          entityType: insight.entityType,
          entityId: insight.entityId,
          insightType: insight.insightType,
          title: insight.title,
          description: insight.description,
          confidenceScore: insight.confidenceScore,
          impactScore: insight.impactScore,
          priority: insight.priority,
          recommendedAction: insight.recommendedAction,
          actionParams: insight.actionParams as any,
          actionLabel: insight.actionLabel,
          status: InsightStatus.PENDING,
          expiresAt: insight.expiresAt,
          aiReasoning: insight.aiReasoning,
        },
      });
    }
  }

  protected trackTokens(input: number, output: number): void {
    this.inputTokens += input;
    this.outputTokens += output;
  }

  protected calculatePriority(
    confidenceScore: number,
    impactScore: number,
  ): InsightPriority {
    const combinedScore = confidenceScore * 0.4 + impactScore * 0.6;
    if (combinedScore >= 0.85) return InsightPriority.URGENT;
    if (combinedScore >= 0.65) return InsightPriority.HIGH;
    if (combinedScore >= 0.4) return InsightPriority.MEDIUM;
    return InsightPriority.LOW;
  }
}
