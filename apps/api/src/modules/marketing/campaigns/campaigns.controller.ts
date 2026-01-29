import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CampaignStatus, CampaignType } from '@prisma/client';

class CreateCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  audienceSegmentId?: string;
  channel?: string;
  subject?: string;
  content?: string;
  senderName?: string;
  scheduledAt?: Date;
  isAbTest?: boolean;
  variants?: Record<string, unknown>;
}

class UpdateCampaignDto {
  name?: string;
  description?: string;
  audienceSegmentId?: string;
  channel?: string;
  subject?: string;
  content?: string;
  senderName?: string;
  scheduledAt?: Date;
}

class ScheduleCampaignDto {
  scheduledAt: Date;
}

class AddStepDto {
  stepNumber: number;
  name?: string;
  delayDays?: number;
  delayHours?: number;
  channel: string;
  subject?: string;
  content: string;
  conditions?: Record<string, unknown>;
}

@Controller('marketing/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.tenantId, {
      ...dto,
      createdBy: user.userId,
    });
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: CampaignStatus,
    @Query('type') type?: CampaignType,
  ) {
    return this.campaignsService.findAll(user.tenantId, { status, type });
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignsService.findOne(user.tenantId, id);
  }

  @Get(':id/stats')
  getStats(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignsService.getStats(user.tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignsService.delete(user.tenantId, id);
  }

  @Post(':id/schedule')
  schedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.campaignsService.schedule(user.tenantId, id, new Date(dto.scheduledAt));
  }

  @Post(':id/send')
  sendNow(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignsService.sendNow(user.tenantId, id);
  }

  @Post(':id/pause')
  pause(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignsService.pause(user.tenantId, id);
  }

  @Post(':id/resume')
  resume(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignsService.resume(user.tenantId, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignsService.cancel(user.tenantId, id);
  }

  @Post(':id/steps')
  addStep(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AddStepDto,
  ) {
    return this.campaignsService.addStep(user.tenantId, id, dto);
  }
}
