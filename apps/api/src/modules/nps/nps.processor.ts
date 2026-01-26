import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NpsService, NPS_QUEUE } from './nps.service';

interface SendSurveyJob {
  surveyToken: string;
  tenantId: string;
}

@Processor(NPS_QUEUE)
export class NpsProcessor extends WorkerHost {
  private readonly logger = new Logger(NpsProcessor.name);

  constructor(private readonly npsService: NpsService) {
    super();
  }

  async process(job: Job<SendSurveyJob>): Promise<void> {
    const { surveyToken, tenantId } = job.data;

    this.logger.log(`Processing NPS survey: ${surveyToken}`);

    try {
      await this.npsService.sendSurvey(surveyToken);
      this.logger.log(`NPS survey sent successfully: ${surveyToken}`);
    } catch (error) {
      this.logger.error(`Failed to send NPS survey ${surveyToken}: ${error.message}`);
      throw error;
    }
  }
}
