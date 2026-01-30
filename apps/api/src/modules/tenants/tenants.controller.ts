import { Controller, Get, Patch, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantWithOwnerDto } from './dto/create-tenant-with-owner.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentTenant(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateCurrentTenant(
    @CurrentUser() user: CurrentUserPayload,
    @Body() updateData: UpdateTenantDto,
  ) {
    return this.tenantsService.update(user.tenantId, updateData);
  }

  @Post('onboard')
  async createTenantWithOwner(@Body() dto: CreateTenantWithOwnerDto) {
    return this.tenantsService.createTenantWithOwner(dto);
  }

  @Post('onboarding/complete')
  @UseGuards(ClerkAuthGuard)
  async completeOnboarding(
    @Req() req: any,
    @Body() body: { step: string; data: any },
  ) {
    const tenantId = req.tenantId;
    return this.tenantsService.completeOnboarding(tenantId, body.step, body.data);
  }
}
