import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Query,
  Body,
  UseGuards,
  Res,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CalendarService } from './calendar.service';
import { CalendarQueueService } from './calendar-queue.service';

@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly calendarQueueService: CalendarQueueService,
  ) {}

  @Get('connect')
  @UseGuards(JwtAuthGuard)
  async getConnectUrl(@CurrentUser() user: CurrentUserPayload) {
    const url = this.calendarService.getAuthUrl(user.tenantId);
    return { url };
  }

  @Get('callback')
  @Public()
  async handleCallback(
    @Query('code') code: string,
    @Query('state') tenantId: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      await this.calendarService.handleCallback(code, tenantId);
      res.redirect(`${frontendUrl}/settings/integrations?calendar=success`);
    } catch (error) {
      res.redirect(`${frontendUrl}/settings/integrations?calendar=error`);
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.calendarService.getIntegration(user.tenantId);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@CurrentUser() user: CurrentUserPayload) {
    return this.calendarService.disconnect(user.tenantId);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { syncEnabled?: boolean; calendarId?: string },
  ) {
    return this.calendarService.updateSettings(user.tenantId, data);
  }

  @Get('calendars')
  @UseGuards(JwtAuthGuard)
  async listCalendars(@CurrentUser() user: CurrentUserPayload) {
    return this.calendarService.listCalendars(user.tenantId);
  }

  @Post('sync/:appointmentId')
  @UseGuards(JwtAuthGuard)
  async syncAppointment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    const jobId = await this.calendarQueueService.queueSync(
      appointmentId,
      user.tenantId,
    );
    return { queued: true, jobId };
  }

  @Post('sync-bulk')
  @UseGuards(JwtAuthGuard)
  async syncBulkAppointments(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { appointmentIds: string[] },
  ) {
    const jobId = await this.calendarQueueService.queueBulkSync(
      data.appointmentIds,
      user.tenantId,
    );
    return { queued: true, jobId };
  }

  @Get('queue/stats')
  @UseGuards(JwtAuthGuard)
  async getQueueStats() {
    return this.calendarQueueService.getQueueStats();
  }

  @Post('queue/retry-failed')
  @UseGuards(JwtAuthGuard)
  async retryFailedJobs() {
    const count = await this.calendarQueueService.retryFailedJobs();
    return { retriedCount: count };
  }
}
