import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  async getCurrentTenant(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Patch('me')
  async updateCurrentTenant(
    @CurrentUser() user: CurrentUserPayload,
    @Body() updateData: any,
  ) {
    return this.tenantsService.update(user.tenantId, updateData);
  }
}
