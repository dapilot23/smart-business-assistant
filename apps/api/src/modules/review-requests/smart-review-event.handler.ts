import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, NpsEventPayload } from '../../config/events/events.types';
import { SmartReviewService } from './smart-review.service';

@Injectable()
export class SmartReviewEventHandler {
  private readonly logger = new Logger(SmartReviewEventHandler.name);

  constructor(
    private readonly smartReviewService: SmartReviewService,
  ) {}

  @OnEvent(EVENTS.NPS_SCORE_SUBMITTED)
  async handleNpsScoreSubmitted(payload: NpsEventPayload) {
    this.logger.log(
      `NPS score ${payload.score} submitted for job ${payload.jobId}`,
    );

    if (!payload.score || !payload.customerId || !payload.jobId) {
      this.logger.warn('Incomplete NPS payload, skipping smart review');
      return;
    }

    await this.smartReviewService.handleNpsScore({
      tenantId: payload.tenantId,
      surveyId: payload.surveyId || '',
      jobId: payload.jobId,
      customerId: payload.customerId,
      score: payload.score,
      feedback: payload.feedback,
    });
  }
}
