import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';

@Controller('settings')
@UseGuards(ClerkAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.settingsService.getSettings(tenantId);
  }

  @Patch()
  async updateSettings(@Req() req: any, @Body() dto: UpdateSettingsDto) {
    const tenantId = req.tenantId;
    return this.settingsService.updateSettings(tenantId, dto);
  }
}
