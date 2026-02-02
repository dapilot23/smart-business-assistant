import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { CommandCenterService } from './command-center.service';

@Controller('command-center')
@UseGuards(ClerkAuthGuard)
export class CommandCenterController {
  constructor(private readonly commandCenterService: CommandCenterService) {}

  @Get('dashboard')
  async getDashboard(
    @CurrentUser() user: CurrentUserPayload,
    @Query('approvalsLimit') approvalsLimit?: string,
    @Query('tasksLimit') tasksLimit?: string,
  ) {
    return this.commandCenterService.getDashboard(user.tenantId, {
      approvalsLimit: this.parseLimit(approvalsLimit),
      tasksLimit: this.parseLimit(tasksLimit),
    });
  }

  @Post('dashboard/refresh')
  async refreshDashboard(
    @CurrentUser() user: CurrentUserPayload,
    @Query('approvalsLimit') approvalsLimit?: string,
    @Query('tasksLimit') tasksLimit?: string,
  ) {
    return this.commandCenterService.refreshDashboard(user.tenantId, {
      approvalsLimit: this.parseLimit(approvalsLimit),
      tasksLimit: this.parseLimit(tasksLimit),
    });
  }

  private parseLimit(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}
