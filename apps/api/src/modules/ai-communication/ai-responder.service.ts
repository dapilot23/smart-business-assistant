import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const AI_RESPONDER_QUEUE = 'ai-responder';

export interface AiResponderJob {
  tenantId: string;
  conversationId: string;
  messageId: string;
  skipAi?: boolean;
}

@Injectable()
export class AiResponderQueueService {
  private readonly logger = new Logger(AiResponderQueueService.name);

  constructor(
    @InjectQueue(AI_RESPONDER_QUEUE) private readonly queue: Queue<AiResponderJob>,
  ) {}

  async queueInboundMessage(job: AiResponderJob): Promise<void> {
    await this.queue.add('process-inbound', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      jobId: `ai-responder-${job.messageId}`,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });

    this.logger.debug(`Queued AI responder job for message ${job.messageId}`);
  }
}
