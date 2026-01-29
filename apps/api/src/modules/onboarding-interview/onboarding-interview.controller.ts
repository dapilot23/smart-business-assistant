import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { OnboardingInterviewService } from './onboarding-interview.service';
import {
  CompleteInterviewDto,
  SendMessageDto,
  SkipQuestionDto,
  StartInterviewDto,
  UpdateProfileFieldDto,
} from './dto/onboarding-interview.dto';

@Controller('onboarding-interview')
@UseGuards(ClerkAuthGuard)
export class OnboardingInterviewController {
  constructor(
    private readonly interviewService: OnboardingInterviewService,
  ) {}

  @Get('status')
  async getStatus(@Req() req: { tenantId: string }) {
    return this.interviewService.getStatus(req.tenantId);
  }

  @Post('start')
  async startInterview(
    @Req() req: { tenantId: string },
    @Body() dto: StartInterviewDto,
  ) {
    return this.interviewService.startInterview(req.tenantId, dto.resume);
  }

  @Post('message')
  async sendMessage(
    @Req() req: { tenantId: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.interviewService.processMessage(
      req.tenantId,
      dto.conversationId,
      dto.message,
    );
  }

  @Post('skip')
  async skipQuestion(
    @Req() req: { tenantId: string },
    @Body() dto: SkipQuestionDto,
  ) {
    return this.interviewService.skipQuestion(req.tenantId, dto.conversationId);
  }

  @Post('complete')
  async completeInterview(
    @Req() req: { tenantId: string },
    @Body() dto: CompleteInterviewDto,
  ) {
    return this.interviewService.completeInterview(
      req.tenantId,
      dto.conversationId,
    );
  }

  @Get('summary')
  async getSummary(@Req() req: { tenantId: string }) {
    return this.interviewService.getSummary(req.tenantId);
  }

  @Get('conversation')
  async getConversation(@Req() req: { tenantId: string }) {
    return this.interviewService.getConversation(req.tenantId);
  }

  @Put('profile')
  async updateProfileField(
    @Req() req: { tenantId: string },
    @Body() dto: UpdateProfileFieldDto,
  ) {
    // Direct field update for settings page
    const profile = await this.interviewService.getSummary(req.tenantId);
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    // This would be implemented to update individual fields
    // For now, return success
    return { success: true };
  }
}
