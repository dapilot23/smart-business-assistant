import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PhotoQuotesService, PHOTO_QUOTE_QUEUE } from './photo-quotes.service';
import { PrismaService } from '../../config/prisma/prisma.service';

interface AnalyzePhotoJob {
  photoQuoteId: string;
  photoUrl: string;
  tenantId: string;
}

@Processor(PHOTO_QUOTE_QUEUE)
export class PhotoQuotesProcessor extends WorkerHost {
  private readonly logger = new Logger(PhotoQuotesProcessor.name);

  constructor(
    private readonly photoQuotesService: PhotoQuotesService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<AnalyzePhotoJob>): Promise<void> {
    const { photoQuoteId, photoUrl, tenantId } = job.data;

    this.logger.log(`Processing photo analysis for quote ${photoQuoteId}`);

    try {
      await this.prisma.withTenantContext(tenantId, async () => {
        await this.photoQuotesService.analyzePhoto(photoQuoteId, photoUrl);
      });
      this.logger.log(`Photo analysis completed: ${photoQuoteId}`);
    } catch (error) {
      this.logger.error(`Photo analysis failed for ${photoQuoteId}: ${error.message}`);
      throw error; // Re-throw to trigger retry
    }
  }
}
