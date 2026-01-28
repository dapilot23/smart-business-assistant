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
import { AppointmentsService } from './appointments.service';
import { AppointmentsSlotsService } from './appointments-slots.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';
import { AvailableSlotsDto } from './dto/available-slots.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly slotsService: AppointmentsSlotsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() filters: AppointmentFilterDto,
  ) {
    return this.appointmentsService.findAll(user.tenantId, filters);
  }

  @Get('available-slots')
  async getAvailableSlots(
    @CurrentUser() user: CurrentUserPayload,
    @Query() dto: AvailableSlotsDto,
  ) {
    return this.slotsService.getAvailableSlots(user.tenantId, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.appointmentsService.findById(user.tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.appointmentsService.cancel(user.tenantId, id);
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  async markNoShow(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.appointmentsService.markNoShow(user.tenantId, id);
  }
}
