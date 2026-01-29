import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

class UpdateSettingsDto {
  isEnabled?: boolean;
  referrerRewardType?: string;
  referrerRewardValue?: number;
  referredRewardType?: string;
  referredRewardValue?: number;
  maxReferralsPerCustomer?: number | null;
  referralExpiryDays?: number;
  minPurchaseForReward?: number | null;
}

class GenerateCodeDto {
  customerId: string;
}

class ConvertReferralDto {
  referredCustomerId: string;
  referredEmail?: string;
  referredPhone?: string;
}

@Controller('marketing/referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.getSettings(user.tenantId);
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateSettingsDto) {
    return this.referralsService.updateSettings(user.tenantId, dto);
  }

  @Get('stats')
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.getStats(user.tenantId);
  }

  @Get('top-referrers')
  getTopReferrers(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return this.referralsService.getTopReferrers(user.tenantId, limit ? parseInt(limit) : 10);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('referrerId') referrerId?: string,
  ) {
    return this.referralsService.findAll(user.tenantId, { status, referrerId });
  }

  @Post('generate')
  generateCode(@CurrentUser() user: CurrentUserPayload, @Body() dto: GenerateCodeDto) {
    return this.referralsService.generateCode(user.tenantId, dto.customerId);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.referralsService.findByCode(code);
  }

  @Post('code/:code/convert')
  convertReferral(@Param('code') code: string, @Body() dto: ConvertReferralDto) {
    return this.referralsService.convertReferral(
      code,
      dto.referredCustomerId,
      dto.referredEmail,
      dto.referredPhone,
    );
  }

  @Patch(':id/reward')
  markRewarded(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.referralsService.markRewarded(user.tenantId, id);
  }
}
