import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { AvailabilityService } from './availability.service';
import { TimeOffService } from './timeoff.service';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  CreateTimeOffDto,
  UpdateTimeOffDto,
} from './dto';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly timeOffService: TimeOffService,
  ) {}

  // Technician Availability Endpoints
  @Get('schedule')
  async findAllAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Query('userId') userId?: string,
  ) {
    return this.availabilityService.findAll(user.tenantId, userId);
  }

  @Get('schedule/:id')
  async findAvailabilityById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.availabilityService.findById(user.tenantId, id);
  }

  @Post('schedule')
  @HttpCode(HttpStatus.CREATED)
  async createAvailability(
    @Body() dto: CreateAvailabilityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.availabilityService.create(user.tenantId, dto);
  }

  @Patch('schedule/:id')
  async updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.availabilityService.update(user.tenantId, id, dto);
  }

  @Delete('schedule/:id')
  @HttpCode(HttpStatus.OK)
  async deleteAvailability(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.availabilityService.delete(user.tenantId, id);
  }

  // Time Off Endpoints
  @Get('time-off')
  async findAllTimeOff(
    @CurrentUser() user: CurrentUserPayload,
    @Query('userId') userId?: string,
  ) {
    return this.timeOffService.findAll(user.tenantId, userId);
  }

  @Get('time-off/:id')
  async findTimeOffById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timeOffService.findById(user.tenantId, id);
  }

  @Post('time-off')
  @HttpCode(HttpStatus.CREATED)
  async createTimeOff(
    @Body() dto: CreateTimeOffDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timeOffService.create(user.tenantId, dto);
  }

  @Patch('time-off/:id')
  async updateTimeOff(
    @Param('id') id: string,
    @Body() dto: UpdateTimeOffDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timeOffService.update(user.tenantId, id, dto);
  }

  @Delete('time-off/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTimeOff(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timeOffService.delete(user.tenantId, id);
  }
}
