import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewRequestsService } from './review-requests.service';
import { ReputationAnalyticsService } from './reputation-analytics.service';
import { CreateReviewRequestDto } from './dto/create-review-request.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';

@Controller('review-requests')
export class ReviewRequestsController {
  constructor(
    private readonly reviewRequestsService: ReviewRequestsService,
    private readonly analyticsService: ReputationAnalyticsService,
  ) {}

  @Get()
  @UseGuards(ClerkAuthGuard)
  async getReviewRequests(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.reviewRequestsService.getReviewRequests(tenantId);
  }

  @Get('stats')
  @UseGuards(ClerkAuthGuard)
  async getReviewStats(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.reviewRequestsService.getReviewStats(tenantId);
  }

  @Get('reputation')
  @UseGuards(ClerkAuthGuard)
  async getReputationDashboard(@Req() req: any) {
    return this.analyticsService.getReputationDashboard(req.tenantId);
  }

  @Get('reputation/velocity')
  @UseGuards(ClerkAuthGuard)
  async getReviewVelocity(
    @Req() req: any,
    @Query('weeks') weeks?: string,
  ) {
    return this.analyticsService.getWeeklyVelocity(
      req.tenantId,
      weeks ? parseInt(weeks, 10) : 12,
    );
  }

  @Get('reputation/platforms')
  @UseGuards(ClerkAuthGuard)
  async getPlatformBreakdown(@Req() req: any) {
    return this.analyticsService.getPlatformBreakdown(req.tenantId);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async createReviewRequest(@Req() req: any, @Body() dto: CreateReviewRequestDto) {
    const tenantId = req.tenantId;
    return this.reviewRequestsService.createReviewRequest(tenantId, dto.jobId);
  }

  @Post(':id/send')
  @UseGuards(ClerkAuthGuard)
  async sendReviewRequest(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.reviewRequestsService.sendReviewRequest(tenantId, id);
  }

  @Get(':id/redirect/:platform')
  async redirectToReview(
    @Param('id') id: string,
    @Param('platform') platform: 'google' | 'yelp',
  ) {
    const result = await this.reviewRequestsService.trackClick(id, platform);
    return { url: result.redirectUrl };
  }
}
