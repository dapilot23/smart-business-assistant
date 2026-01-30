import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
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
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get tenant ID from request, with demo mode fallback
   * In demo mode (non-production), uses the demo tenant
   * In production, requires authenticated user with tenantId
   */
  private async getTenantId(req: { tenantId?: string }): Promise<string> {
    // If authenticated, use the user's tenant
    if (req.tenantId) {
      return req.tenantId;
    }

    // Check for demo mode (only in non-production)
    const isDemoMode = this.configService.get('DEMO_MODE') === 'true';
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    if (isDemoMode && !isProduction) {
      // Use demo tenant in demo mode
      const demoTenantId = await this.interviewService.getDemoTenantId();
      if (demoTenantId) {
        return demoTenantId;
      }
    }

    // In production without auth, reject the request
    throw new BadRequestException(
      'Authentication required. Please sign in to continue.',
    );
  }

  @Public()
  @Get('status')
  async getStatus(@Req() req: { tenantId?: string }) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.getStatus(tenantId);
  }

  @Public()
  @Post('start')
  async startInterview(
    @Req() req: { tenantId?: string },
    @Body() dto: StartInterviewDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.startInterview(tenantId, dto.resume);
  }

  @Public()
  @Post('message')
  async sendMessage(
    @Req() req: { tenantId?: string },
    @Body() dto: SendMessageDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.processMessage(
      tenantId,
      dto.conversationId,
      dto.message,
    );
  }

  @Public()
  @Post('skip')
  async skipQuestion(
    @Req() req: { tenantId?: string },
    @Body() dto: SkipQuestionDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.skipQuestion(tenantId, dto.conversationId);
  }

  @Public()
  @Post('complete')
  async completeInterview(
    @Req() req: { tenantId?: string },
    @Body() dto: CompleteInterviewDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.completeInterview(
      tenantId,
      dto.conversationId,
    );
  }

  @Public()
  @Get('summary')
  async getSummary(@Req() req: { tenantId?: string }) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.getSummary(tenantId);
  }

  @Public()
  @Get('conversation')
  async getConversation(@Req() req: { tenantId?: string }) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.getConversation(tenantId);
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
