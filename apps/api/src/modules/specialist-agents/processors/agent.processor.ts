import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AgentOrchestratorService } from '../agent-orchestrator.service';
import { AgentType } from '@prisma/client';

export interface AgentJobData {
  tenantId: string;
  agentType: AgentType;
  triggeredBy: 'schedule' | 'event' | 'manual';
  triggerEvent?: string;
}

@Processor('specialist-agents')
export class AgentProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentProcessor.name);

  constructor(private readonly orchestrator: AgentOrchestratorService) {
    super();
  }

  async process(job: Job<AgentJobData>): Promise<string> {
    const { tenantId, agentType, triggeredBy, triggerEvent } = job.data;

    this.logger.log(
      `Processing agent job: ${agentType} for tenant ${tenantId} (triggered by ${triggeredBy})`,
    );

    try {
      const runId = await this.orchestrator.runAgent(
        tenantId,
        agentType,
        triggeredBy,
        triggerEvent,
      );
      this.logger.log(`Agent ${agentType} completed with run ID: ${runId}`);
      return runId;
    } catch (error) {
      this.logger.error(
        `Agent ${agentType} failed for tenant ${tenantId}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}
