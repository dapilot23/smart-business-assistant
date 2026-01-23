import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PublicBookingService } from './public-booking.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('public')
@Public()
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get('tenants/slug/:slug')
  async getTenantBySlug(@Param('slug') slug: string) {
    const tenant = await this.publicBookingService.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Business not found');
    }
    return tenant;
  }

  @Get('tenants/:tenantId/services')
  async getServices(@Param('tenantId') tenantId: string) {
    return this.publicBookingService.getPublicServices(tenantId);
  }

  @Get('tenants/:tenantId/services/:serviceId/slots')
  async getAvailableSlots(
    @Param('tenantId') tenantId: string,
    @Param('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('Date parameter is required');
    }
    return this.publicBookingService.getAvailableTimeSlots(
      tenantId,
      serviceId,
      new Date(date),
    );
  }

  @Post('tenants/:tenantId/bookings')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreatePublicBookingDto,
  ) {
    return this.publicBookingService.createBooking(tenantId, dto);
  }

  // Booking management endpoints (token-based, no auth required)
  @Get('bookings/:token')
  async getBookingByToken(@Param('token') token: string) {
    const booking = await this.publicBookingService.getBookingByToken(token);
    return {
      id: booking.id,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      duration: booking.duration,
      confirmationCode: booking.confirmationCode,
      service: booking.service
        ? {
            name: booking.service.name,
            description: booking.service.description,
            price: booking.service.price,
          }
        : null,
      customer: {
        name: booking.customer.name,
        email: booking.customer.email,
        phone: booking.customer.phone,
      },
      tenant: booking.tenant,
    };
  }

  @Post('bookings/:token/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Param('token') token: string,
    @Body() body: { reason?: string },
  ) {
    return this.publicBookingService.cancelBooking(token, body.reason);
  }

  @Post('bookings/:token/reschedule')
  @HttpCode(HttpStatus.OK)
  async rescheduleBooking(
    @Param('token') token: string,
    @Body() body: { scheduledAt: string },
  ) {
    if (!body.scheduledAt) {
      throw new BadRequestException('New scheduled time is required');
    }
    return this.publicBookingService.rescheduleBooking(token, body.scheduledAt);
  }

  @Get('bookings/:token/available-slots')
  async getAvailableSlotsForReschedule(
    @Param('token') token: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('Date parameter is required');
    }
    const booking = await this.publicBookingService.getBookingByToken(token);
    if (!booking.service) {
      throw new BadRequestException('Booking has no associated service');
    }
    return this.publicBookingService.getAvailableTimeSlots(
      booking.tenantId,
      booking.service.id,
      new Date(date),
    );
  }
}
