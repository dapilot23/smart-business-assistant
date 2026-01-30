import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NpsService, NPS_QUEUE } from './nps.service';
import { PrismaService } from '../../config/prisma/prisma.service';

interface SendSurveyJob {
  surveyToken: string;
  tenantId: string;
}

@Processor(NPS_QUEUE)
export class NpsProcessor extends WorkerHost {
  private readonly logger = new Logger(NpsProcessor.name);

  constructor(
    private readonly npsService: NpsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<SendSurveyJob>): Promise<void> {
    const { surveyToken } = job.data;

    this.logger.log(`Processing NPS survey: ${surveyToken}`);

    try {
      await this.prisma.withSystemContext(async () => {
        await this.npsService.sendSurvey(surveyToken);
      });
      this.logger.log(`NPS survey sent successfully: ${surveyToken}`);
    } catch (error) {
      this.logger.error(`Failed to send NPS survey ${surveyToken}: ${error.message}`);
      throw error;
    }
  }
}
