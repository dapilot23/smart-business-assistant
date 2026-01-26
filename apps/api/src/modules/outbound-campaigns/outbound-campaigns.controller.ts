import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OutboundCampaignsService, CreateCampaignDto } from './outbound-campaigns.service';
import { OutboundCampaignStatus } from '@prisma/client';

@Controller('outbound-campaigns')
@UseGuards(JwtAuthGuard)
export class OutboundCampaignsController {
  constructor(private readonly campaignsService: OutboundCampaignsService) {}

  @Post()
  async createCampaign(@Request() req, @Body() dto: CreateCampaignDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    return this.campaignsService.createCampaign(tenantId, dto, userId);
  }

  @Get()
  async listCampaigns(
    @Request() req,
    @Query('status') status?: OutboundCampaignStatus,
    @Query('limit') limit?: number,
  ) {
    const tenantId = req.user?.tenantId;
    return this.campaignsService.listCampaigns(tenantId, {
      status,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id')
  async getCampaign(@Param('id') id: string) {
    return this.campaignsService.getCampaign(id);
  }

  @Post(':id/start')
  async startCampaign(@Param('id') id: string) {
    return this.campaignsService.startCampaign(id);
  }

  @Post(':id/pause')
  async pauseCampaign(@Param('id') id: string) {
    return this.campaignsService.pauseCampaign(id);
  }

  @Post(':id/cancel')
  async cancelCampaign(@Param('id') id: string) {
    return this.campaignsService.cancelCampaign(id);
  }

  @Post(':id/calls')
  async addCalls(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { customerIds: string[] },
  ) {
    const tenantId = req.user?.tenantId;
    const count = await this.campaignsService.addCallsToCampaign(id, tenantId, body.customerIds);
    return { added: count };
  }

  @Post('appointment-reminders')
  async createAppointmentReminderCampaign(
    @Request() req,
    @Body() body?: { hoursInAdvance?: number },
  ) {
    const tenantId = req.user?.tenantId;
    return this.campaignsService.createAppointmentReminderCampaign(
      tenantId,
      body?.hoursInAdvance,
    );
  }

  @Post('follow-up-surveys')
  async createFollowUpSurveyCampaign(@Request() req, @Body() body: { jobIds: string[] }) {
    const tenantId = req.user?.tenantId;
    return this.campaignsService.createFollowUpSurveyCampaign(tenantId, body.jobIds);
  }
}
