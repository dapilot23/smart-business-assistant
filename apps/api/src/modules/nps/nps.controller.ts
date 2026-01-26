import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { NpsService } from './nps.service';
import { PrismaService } from '../../config/prisma/prisma.service';

@Controller('nps')
export class NpsController {
  constructor(
    private readonly npsService: NpsService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // Public Survey Endpoints
  // ============================================

  /**
   * Get survey by token (for public survey page)
   */
  @Public()
  @Get('survey/:token')
  async getSurvey(@Param('token') token: string) {
    return this.npsService.getSurveyByToken(token);
  }

  /**
   * Submit NPS score
   */
  @Public()
  @Post('survey/:token/submit')
  async submitScore(
    @Param('token') token: string,
    @Body() body: { score: number; feedback?: string },
  ) {
    return this.npsService.submitScore(token, body.score, body.feedback);
  }

  /**
   * Record review click
   */
  @Public()
  @Post('survey/:token/review-click')
  async recordReviewClick(
    @Param('token') token: string,
    @Body() body: { platform: string },
  ) {
    await this.npsService.recordReviewClick(token, body.platform);
    return { success: true };
  }

  /**
   * Redirect to review platform
   */
  @Public()
  @Get('survey/:token/review/:platform')
  async redirectToReview(
    @Param('token') token: string,
    @Param('platform') platform: string,
    @Res() res: Response,
  ) {
    const survey = await this.npsService.getSurveyByToken(token);

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Record click
    await this.npsService.recordReviewClick(token, platform);

    // Get review URL
    const reviewUrl = platform === 'google'
      ? survey.reviewUrls?.google
      : survey.reviewUrls?.yelp;

    if (!reviewUrl) {
      return res.status(404).json({ error: 'Review URL not configured' });
    }

    return res.redirect(reviewUrl);
  }

  // ============================================
  // Admin Endpoints (Authenticated)
  // ============================================

  /**
   * Get NPS analytics
   */
  @UseGuards(JwtAuthGuard)
  @Get('analytics')
  async getAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.npsService.getAnalytics(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * List surveys
   */
  @UseGuards(JwtAuthGuard)
  @Get('surveys')
  async listSurveys(
    @Request() req,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    const tenantId = req.user?.tenantId;
    return this.npsService.listSurveys(tenantId, {
      status,
      limit: limit ? +limit : undefined,
    });
  }

  /**
   * Manually schedule a survey for a job
   */
  @UseGuards(JwtAuthGuard)
  @Post('schedule')
  async scheduleSurvey(
    @Request() req,
    @Body() body: { jobId: string; delayHours?: number },
  ) {
    const tenantId = req.user?.tenantId;

    // Get job to find customer
    const job = await this.prisma.job.findFirst({
      where: { id: body.jobId, tenantId },
      include: { appointment: true },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    await this.npsService.scheduleSurvey(
      tenantId,
      body.jobId,
      job.appointment.customerId,
      body.delayHours,
    );

    return { success: true, message: 'Survey scheduled' };
  }

  /**
   * Resend a survey
   */
  @UseGuards(JwtAuthGuard)
  @Post('surveys/:id/resend')
  async resendSurvey(@Param('id') id: string) {
    const survey = await this.prisma.npsSurvey.findUnique({
      where: { id },
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Reset status and resend
    await this.prisma.npsSurvey.update({
      where: { id },
      data: { status: 'PENDING', sentAt: null },
    });

    await this.npsService.sendSurvey(survey.token);
    return { success: true };
  }
}
