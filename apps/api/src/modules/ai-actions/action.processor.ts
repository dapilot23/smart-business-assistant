import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ActionExecutorService } from './action-executor.service';

interface ActionJobData {
  actionId: string;
}

@Processor('ai-actions')
export class ActionProcessor extends WorkerHost {
  private readonly logger = new Logger(ActionProcessor.name);

  constructor(private readonly actionExecutor: ActionExecutorService) {
    super();
  }

  async process(job: Job<ActionJobData>): Promise<void> {
    const { actionId } = job.data;

    this.logger.log(`Processing action ${actionId} (attempt ${job.attemptsMade + 1})`);

    try {
      const result = await this.actionExecutor.executeAction(actionId);

      if (!result.success) {
        throw new Error(result.error || 'Action execution failed');
      }

      this.logger.log(`Action ${actionId} executed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Action ${actionId} failed: ${errorMessage}`);
      throw error; // Re-throw to trigger retry
    }
  }
}
