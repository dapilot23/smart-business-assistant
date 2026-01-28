import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { NoshowPreventionService } from './noshow-prevention.service';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';

@Controller('noshow-prevention')
export class NoshowPreventionController {
  constructor(
    private readonly noshowService: NoshowPreventionService,
    private readonly waitlistService: WaitlistService,
  ) {}

  @Get('analytics')
  async getAnalytics(@Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.noshowService.getNoShowAnalytics(tenantId);
  }

  @Post('waitlist')
  async addToWaitlist(@Body() dto: CreateWaitlistDto, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.waitlistService.addToWaitlist(dto, tenantId);
  }

  @Get('waitlist')
  async getWaitlist(@Query('status') status: string, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.waitlistService.getWaitlist(tenantId, status);
  }

  @Delete('waitlist/:id')
  async removeFromWaitlist(@Param('id') id: string, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.waitlistService.removeFromWaitlist(id, tenantId);
  }

  @Post('waitlist/:id/confirm')
  async confirmWaitlistBooking(@Param('id') id: string, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.waitlistService.confirmWaitlistBooking(id, tenantId);
  }
}
