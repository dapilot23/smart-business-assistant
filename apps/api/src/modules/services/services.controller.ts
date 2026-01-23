import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { ServicesService } from './services.service';
import {
  CreateServiceAvailabilityDto,
  UpdateServiceAvailabilityDto,
  UpdateServiceSettingsDto,
} from './dto/service-availability.dto';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.servicesService.findAll(user.tenantId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.servicesService.findOne(user.tenantId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    data: {
      name: string;
      description?: string;
      durationMinutes?: number;
      price?: number;
    },
  ) {
    return this.servicesService.create(user.tenantId, data);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body()
    data: Partial<{
      name: string;
      description: string;
      durationMinutes: number;
      price: number;
    }>,
  ) {
    return this.servicesService.update(user.tenantId, id, data);
  }

  @Patch(':id/settings')
  async updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateServiceSettingsDto,
  ) {
    return this.servicesService.updateSettings(user.tenantId, id, dto);
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.servicesService.delete(user.tenantId, id);
  }

  // Service Availability endpoints
  @Get(':id/availability')
  async getAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.servicesService.getAvailability(user.tenantId, id);
  }

  @Post(':id/availability')
  async setAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateServiceAvailabilityDto,
  ) {
    return this.servicesService.setAvailability(user.tenantId, id, dto);
  }

  @Put(':id/availability')
  async setBulkAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() data: { availabilities: CreateServiceAvailabilityDto[] },
  ) {
    return this.servicesService.setBulkAvailability(
      user.tenantId,
      id,
      data.availabilities,
    );
  }

  @Patch(':id/availability/:dayOfWeek')
  async updateAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @Body() dto: UpdateServiceAvailabilityDto,
  ) {
    return this.servicesService.updateAvailability(
      user.tenantId,
      id,
      dayOfWeek,
      dto,
    );
  }

  @Delete(':id/availability/:dayOfWeek')
  async deleteAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
  ) {
    return this.servicesService.deleteAvailability(
      user.tenantId,
      id,
      dayOfWeek,
    );
  }
}
