import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import {
  EVENTS,
  AppointmentEventPayload,
} from '../../config/events/events.types';
import { CalendarQueueService } from '../calendar/calendar-queue.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { toNum } from '../../common/utils/decimal';
import { randomBytes } from 'crypto';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    @Inject(forwardRef(() => CalendarQueueService))
    private readonly calendarQueueService: CalendarQueueService,
    private readonly scheduling: SchedulingService,
  ) {}

  async findTenantBySlug(slug: string) {
    return this.prisma.withSystemContext(() =>
      this.prisma.tenant.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      }),
    );
  }

  async getPublicServices(tenantId: string) {
    return this.prisma.withTenantContext(tenantId, () =>
      this.prisma.service.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          price: true,
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async getAvailableTimeSlots(tenantId: string, serviceId: string, date: Date) {
    return this.prisma.withTenantContext(tenantId, async () => {
      const service = await this.prisma.service.findFirst({
        where: { id: serviceId, tenantId },
        include: { availability: true },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      if (!service.isActive) {
        return []; // Service not accepting bookings
      }

      // Check lead time requirement
      const minBookingTime = new Date();
      minBookingTime.setHours(minBookingTime.getHours() + service.leadTimeHours);

      const { startMinutes, endMinutes } = await this.scheduling.resolveAvailabilityWindow({
        tenantId,
        date,
        serviceAvailability: service.availability,
      });

      // Get existing appointments and check max per day
      const { startOfDay, endOfDay } = this.scheduling.getDayBounds(date);

      const existingAppointments = await this.prisma.appointment.findMany({
        where: {
          tenantId,
          scheduledAt: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ['CANCELLED'] },
        },
      });

      // Check max per day limit for this service
      const serviceAppts = existingAppointments.filter(
        (a) => a.serviceId === serviceId,
      );
      if (service.maxPerDay && serviceAppts.length >= service.maxPerDay) {
        return []; // Max appointments reached for this day
      }

      // Build blocked times (including buffer)
      const blockedRanges = this.scheduling.buildBlockedRanges(
        existingAppointments,
        service.bufferMinutes,
      );

      const slots = this.scheduling.generateSlots({
        date,
        startMinutes,
        endMinutes,
        duration: service.durationMinutes,
        minBookingTime,
        blockedRanges,
      });

      return slots.map((slot) => ({
        time: slot.timeLabel,
        available: slot.available,
      }));
    });
  }

  async createBooking(tenantId: string, dto: CreatePublicBookingDto) {
    const { response } = await this.createBookingInternal(tenantId, {
      serviceId: dto.serviceId,
      scheduledAt: dto.scheduledAt,
      customer: dto.customer,
    });
    return response;
  }

  async createBookingInternal(
    tenantId: string,
    input: {
      serviceId: string;
      scheduledAt: string | Date;
      customer: {
        name: string;
        email?: string | null;
        phone: string;
        notes?: string;
      };
      appointmentNotes?: string;
    },
  ) {
    return this.prisma.withTenantContext(tenantId, async () => {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException('Business not found');
      }

      const customerMatchers: Array<{ email?: string; phone?: string }> = [];
      if (input.customer.email) {
        customerMatchers.push({ email: input.customer.email });
      }
      if (input.customer.phone) {
        customerMatchers.push({ phone: input.customer.phone });
      }

      let customer = customerMatchers.length
        ? await this.prisma.customer.findFirst({
            where: {
              tenantId,
              OR: customerMatchers,
            },
          })
        : null;

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            tenantId,
            name: input.customer.name,
            email: input.customer.email || undefined,
            phone: input.customer.phone,
            notes: input.customer.notes,
          },
        });
      }

      // Verify service exists
      const service = await this.prisma.service.findUnique({
        where: { id: input.serviceId },
        include: { availability: true },
      });

      if (!service || service.tenantId !== tenantId) {
        throw new NotFoundException('Service not found');
      }

      if (!service.isActive) {
        throw new BadRequestException('Service is not accepting bookings');
      }

      const scheduledAt =
        input.scheduledAt instanceof Date
          ? input.scheduledAt
          : new Date(input.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Invalid scheduled time');
      }

      // Enforce lead time and prevent past bookings
      const minBookingTime = new Date();
      minBookingTime.setHours(minBookingTime.getHours() + service.leadTimeHours);
      if (scheduledAt < minBookingTime) {
        throw new BadRequestException('Selected time is too soon for this service');
      }

      const { startMinutes, endMinutes } = await this.scheduling.resolveAvailabilityWindow({
        tenantId,
        date: scheduledAt,
        serviceAvailability: service.availability,
      });

      const slotStart = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
      const slotEnd = slotStart + service.durationMinutes;
      if (slotStart < startMinutes || slotEnd > endMinutes) {
        throw new BadRequestException('Selected time is outside availability');
      }

      const { startOfDay, endOfDay } = this.scheduling.getDayBounds(scheduledAt);
      const existingAppointments = await this.prisma.appointment.findMany({
        where: {
          tenantId,
          scheduledAt: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ['CANCELLED'] },
        },
      });

      const serviceAppts = existingAppointments.filter(
        (a) => a.serviceId === input.serviceId,
      );
      if (service.maxPerDay && serviceAppts.length >= service.maxPerDay) {
        throw new BadRequestException('No availability remaining for this day');
      }

      const blockedRanges = this.scheduling.buildBlockedRanges(
        existingAppointments,
        service.bufferMinutes,
      );

      if (this.scheduling.isSlotBlocked(slotStart, slotEnd, blockedRanges)) {
        throw new BadRequestException('This time slot is no longer available');
      }

      // Generate confirmation code and manage token
      const confirmationCode = this.generateConfirmationCode();
      const manageToken = this.generateManageToken();

      // Create appointment
      const appointment = await this.prisma.appointment.create({
        data: {
          tenantId,
          customerId: customer.id,
          serviceId: input.serviceId,
          scheduledAt,
          duration: service.durationMinutes,
          status: 'SCHEDULED',
          notes: input.appointmentNotes ?? input.customer.notes,
          confirmationCode,
          manageToken,
        },
        include: {
          customer: true,
          service: true,
        },
      });

      // Emit event for async notifications
      this.eventsService.emit<AppointmentEventPayload>(
        EVENTS.APPOINTMENT_CREATED,
        {
          tenantId,
          appointmentId: appointment.id,
          customerId: appointment.customer.id,
          customerName: appointment.customer.name,
          customerPhone: appointment.customer.phone,
          customerEmail: appointment.customer.email || undefined,
          scheduledAt: appointment.scheduledAt,
          serviceName: appointment.service?.name,
        },
      );

      // Queue calendar sync (non-blocking)
      this.calendarQueueService.queueSync(appointment.id, tenantId).catch((err) => {
        this.logger.error('Failed to queue calendar sync:', err);
      });

      const depositInfo = await this.getDepositInfo(tenantId, toNum(service.price));

      return {
        appointment,
        response: {
          id: appointment.id,
          confirmationCode,
          manageToken,
          success: true,
          ...depositInfo,
        },
      };
    });
  }

  private async getDepositInfo(tenantId: string, servicePrice: number) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings?.depositRequired || servicePrice <= 0) {
      return { requiresDeposit: false };
    }

    const depositPercentage = settings.depositPercentage || 50;
    const depositAmount = Math.round(servicePrice * depositPercentage) / 100;

    return {
      requiresDeposit: true,
      depositPercentage,
      depositAmount,
    };
  }

  async getBookingByToken(token: string) {
    const appointment = await this.prisma.withSystemContext(() =>
      this.prisma.appointment.findUnique({
        where: { manageToken: token },
        include: {
          customer: true,
          service: true,
          tenant: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      }),
    );

    if (!appointment) {
      throw new NotFoundException('Booking not found');
    }

    return appointment;
  }

  async cancelBooking(token: string, reason?: string) {
    const appointment = await this.getBookingByToken(token);

    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('This booking has already been cancelled');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    // Check if within cancellation window (e.g., 24 hours before)
    const hoursUntilAppointment =
      (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 2) {
      throw new BadRequestException(
        'Cancellations must be made at least 2 hours before the appointment',
      );
    }

    return this.prisma.withTenantContext(appointment.tenantId, async () => {
      const updated = await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
        include: {
          customer: true,
          service: true,
          tenant: true,
        },
      });

      // Emit event for async notifications
      this.eventsService.emit<AppointmentEventPayload>(
        EVENTS.APPOINTMENT_CANCELLED,
        {
          tenantId: updated.tenantId,
          appointmentId: updated.id,
          customerId: updated.customer.id,
          customerName: updated.customer.name,
          customerPhone: updated.customer.phone,
          customerEmail: updated.customer.email || undefined,
          scheduledAt: updated.scheduledAt,
          serviceName: updated.service?.name,
        },
      );

      // Queue calendar event deletion (non-blocking)
      this.calendarQueueService.queueDelete(appointment.id, appointment.tenantId).catch((err) => {
        this.logger.error('Failed to queue calendar delete:', err);
      });

      return { success: true, message: 'Booking cancelled successfully' };
    });
  }

  async rescheduleBooking(token: string, newScheduledAt: string) {
    const appointment = await this.getBookingByToken(token);

    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('Cannot reschedule a cancelled booking');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot reschedule a completed appointment');
    }

    const newDateTime = new Date(newScheduledAt);
    if (Number.isNaN(newDateTime.getTime())) {
      throw new BadRequestException('Invalid scheduled time');
    }

    // Check if new time is in the future
    if (newDateTime < new Date()) {
      throw new BadRequestException('Cannot reschedule to a past time');
    }

    const serviceId = appointment.serviceId;
    if (!serviceId) {
      throw new BadRequestException('Booking has no associated service');
    }

    return this.prisma.withTenantContext(appointment.tenantId, async () => {
      const { startOfDay, endOfDay } = this.scheduling.getDayBounds(newDateTime);
      const existingAppointments = await this.prisma.appointment.findMany({
        where: {
          tenantId: appointment.tenantId,
          scheduledAt: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ['CANCELLED'] },
          id: { not: appointment.id },
        },
      });

      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        include: { availability: true },
      });

      if (!service) {
        throw new BadRequestException('Service not found for reschedule');
      }

      const serviceAppts = existingAppointments.filter(
        (a) => a.serviceId === serviceId,
      );
      if (service.maxPerDay && serviceAppts.length >= service.maxPerDay) {
        throw new BadRequestException('No availability remaining for this day');
      }

      const { startMinutes, endMinutes } = await this.scheduling.resolveAvailabilityWindow({
        tenantId: appointment.tenantId,
        date: newDateTime,
        serviceAvailability: service.availability,
      });

      const slotStart = newDateTime.getHours() * 60 + newDateTime.getMinutes();
      const slotEnd = slotStart + service.durationMinutes;
      if (slotStart < startMinutes || slotEnd > endMinutes) {
        throw new BadRequestException('Selected time is outside availability');
      }

      const blockedRanges = this.scheduling.buildBlockedRanges(
        existingAppointments,
        service.bufferMinutes,
      );

      if (this.scheduling.isSlotBlocked(slotStart, slotEnd, blockedRanges)) {
        throw new BadRequestException('This time slot is not available');
      }

      const updated = await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { scheduledAt: newDateTime },
        include: {
          customer: true,
          service: true,
          tenant: true,
        },
      });

      // Emit event for async notifications
      this.eventsService.emit<AppointmentEventPayload>(
        EVENTS.APPOINTMENT_UPDATED,
        {
          tenantId: updated.tenantId,
          appointmentId: updated.id,
          customerId: updated.customer.id,
          customerName: updated.customer.name,
          customerPhone: updated.customer.phone,
          customerEmail: updated.customer.email || undefined,
          scheduledAt: updated.scheduledAt,
          serviceName: updated.service?.name,
        },
      );

      // Queue calendar update (non-blocking)
      this.calendarQueueService.queueSync(updated.id, updated.tenantId).catch((err) => {
        this.logger.error('Failed to queue calendar update:', err);
      });

      return {
        success: true,
        message: 'Booking rescheduled successfully',
        newScheduledAt: newDateTime,
      };
    });
  }

  private generateConfirmationCode(): string {
    // Generate a 6-character alphanumeric code
    return randomBytes(3).toString('hex').toUpperCase();
  }

  private generateManageToken(): string {
    // Generate a secure 32-character token
    return randomBytes(16).toString('hex');
  }
}
