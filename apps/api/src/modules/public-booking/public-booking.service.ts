import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';
import { CalendarQueueService } from '../calendar/calendar-queue.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => CalendarQueueService))
    private readonly calendarQueueService: CalendarQueueService,
  ) {}

  async findTenantBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
  }

  async getPublicServices(tenantId: string) {
    return this.prisma.service.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        price: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAvailableTimeSlots(tenantId: string, serviceId: string, date: Date) {
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

    const dayOfWeek = date.getDay();

    // Get service-specific or technician availability
    const serviceAvail = service.availability.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isActive,
    );

    const techAvailability = await this.prisma.technicianAvailability.findMany({
      where: { tenantId, dayOfWeek, isActive: true },
    });

    // Check for time off
    const timeOffs = await this.prisma.timeOff.findMany({
      where: {
        tenantId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    const timeOffUserIds = new Set(timeOffs.map((t) => t.userId));
    const activeTechAvail = techAvailability.filter(
      (a) => !timeOffUserIds.has(a.userId),
    );

    // Determine available hours (service-specific takes precedence)
    let startHour = 9;
    let endHour = 17;

    if (serviceAvail) {
      startHour = parseInt(serviceAvail.startTime.split(':')[0]);
      endHour = parseInt(serviceAvail.endTime.split(':')[0]);
    } else if (activeTechAvail.length > 0) {
      startHour = this.getEarliestHour(activeTechAvail);
      endHour = this.getLatestHour(activeTechAvail);
    }

    // Get existing appointments and check max per day
    const { startOfDay, endOfDay } = this.getDayBounds(date);

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
    const blockedRanges = this.buildBlockedRanges(
      existingAppointments,
      service.bufferMinutes,
    );

    return this.generateSlots(
      date,
      startHour,
      endHour,
      service.durationMinutes,
      minBookingTime,
      blockedRanges,
    );
  }

  private getEarliestHour(
    availability: { startTime: string }[],
  ): number {
    return availability.reduce((min, a) => {
      const hour = parseInt(a.startTime.split(':')[0]);
      return hour < min ? hour : min;
    }, 24);
  }

  private getLatestHour(availability: { endTime: string }[]): number {
    return availability.reduce((max, a) => {
      const hour = parseInt(a.endTime.split(':')[0]);
      return hour > max ? hour : max;
    }, 0);
  }

  private getDayBounds(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
  }

  private buildBlockedRanges(
    appointments: { scheduledAt: Date; duration: number }[],
    bufferMinutes: number,
  ): Array<{ start: number; end: number }> {
    return appointments.map((a) => {
      const start = a.scheduledAt.getHours() * 60 + a.scheduledAt.getMinutes();
      const end = start + a.duration + bufferMinutes;
      return { start, end };
    });
  }

  private generateSlots(
    date: Date,
    startHour: number,
    endHour: number,
    duration: number,
    minBookingTime: Date,
    blockedRanges: Array<{ start: number; end: number }>,
  ): Array<{ time: string; available: boolean }> {
    const slots: Array<{ time: string; available: boolean }> = [];

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotDateTime = new Date(date);
        slotDateTime.setHours(hour, minute, 0, 0);

        // Skip if before minimum booking time
        if (slotDateTime < minBookingTime) continue;

        const slotMinutes = hour * 60 + minute;
        const slotEnd = slotMinutes + duration;

        // Check if slot overlaps with any blocked range
        const isBlocked = blockedRanges.some(
          (range) => slotMinutes < range.end && slotEnd > range.start,
        );

        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ time, available: !isBlocked });
      }
    }

    return slots;
  }

  async createBooking(tenantId: string, dto: CreatePublicBookingDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Business not found');
    }

    // Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [{ email: dto.customer.email }, { phone: dto.customer.phone }],
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          tenantId,
          name: dto.customer.name,
          email: dto.customer.email,
          phone: dto.customer.phone,
          notes: dto.customer.notes,
        },
      });
    }

    // Verify service exists
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service || service.tenantId !== tenantId) {
      throw new NotFoundException('Service not found');
    }

    // Check if time slot is still available
    const scheduledAt = new Date(dto.scheduledAt);
    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        serviceId: dto.serviceId,
        scheduledAt,
        status: { notIn: ['CANCELLED'] },
      },
    });

    if (existingAppointment) {
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
        serviceId: dto.serviceId,
        scheduledAt,
        duration: service.durationMinutes,
        status: 'SCHEDULED',
        notes: dto.customer.notes,
        confirmationCode,
        manageToken,
      },
      include: {
        customer: true,
        service: true,
      },
    });

    // Send confirmations (non-blocking)
    this.sendConfirmations(appointment, tenant, manageToken).catch((err) => {
      this.logger.error('Failed to send confirmations:', err);
    });

    // Queue calendar sync (non-blocking)
    this.calendarQueueService.queueSync(appointment.id, tenantId).catch((err) => {
      this.logger.error('Failed to queue calendar sync:', err);
    });

    return {
      id: appointment.id,
      confirmationCode,
      manageToken,
      success: true,
    };
  }

  async getBookingByToken(token: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { manageToken: token },
      include: {
        customer: true,
        service: true,
        tenant: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

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

    // Send cancellation notifications
    this.sendCancellationNotifications(updated).catch((err) => {
      this.logger.error('Failed to send cancellation notifications:', err);
    });

    // Queue calendar event deletion (non-blocking)
    this.calendarQueueService.queueDelete(appointment.id, appointment.tenantId).catch((err) => {
      this.logger.error('Failed to queue calendar delete:', err);
    });

    return { success: true, message: 'Booking cancelled successfully' };
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

    // Check if new time is in the future
    if (newDateTime < new Date()) {
      throw new BadRequestException('Cannot reschedule to a past time');
    }

    // Check if new slot is available
    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        tenantId: appointment.tenantId,
        scheduledAt: newDateTime,
        status: { notIn: ['CANCELLED'] },
        id: { not: appointment.id },
      },
    });

    if (existingAppointment) {
      throw new BadRequestException('This time slot is not available');
    }

    const oldScheduledAt = appointment.scheduledAt;

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { scheduledAt: newDateTime },
      include: {
        customer: true,
        service: true,
        tenant: true,
      },
    });

    // Send reschedule notifications
    this.sendRescheduleNotifications(updated, oldScheduledAt).catch((err) => {
      this.logger.error('Failed to send reschedule notifications:', err);
    });

    // Queue calendar update (non-blocking)
    this.calendarQueueService.queueSync(updated.id, updated.tenantId).catch((err) => {
      this.logger.error('Failed to queue calendar update:', err);
    });

    return {
      success: true,
      message: 'Booking rescheduled successfully',
      newScheduledAt: newDateTime,
    };
  }

  private async sendConfirmations(
    appointment: {
      customer: { name: string; phone: string; email: string | null };
      service: { name: string } | null;
      scheduledAt: Date;
      duration: number;
      confirmationCode: string | null;
    },
    tenant: { name: string; email: string; phone: string | null },
    manageToken: string,
  ) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Send SMS
    try {
      await this.smsService.sendAppointmentConfirmation(
        {
          id: '',
          scheduledAt: appointment.scheduledAt,
          duration: appointment.duration,
          service: appointment.service ? { name: appointment.service.name } : undefined,
        },
        { name: appointment.customer.name, phone: appointment.customer.phone },
      );
      this.logger.log(`SMS confirmation sent to ${appointment.customer.phone}`);
    } catch (error) {
      this.logger.warn(`SMS not sent: ${error.message}`);
    }

    // Send email
    if (appointment.customer.email) {
      try {
        await this.emailService.sendBookingConfirmation({
          customerName: appointment.customer.name,
          customerEmail: appointment.customer.email,
          serviceName: appointment.service?.name || 'Appointment',
          scheduledAt: appointment.scheduledAt,
          duration: appointment.duration,
          businessName: tenant.name,
          businessEmail: tenant.email,
          businessPhone: tenant.phone || undefined,
          confirmationCode: appointment.confirmationCode || undefined,
          cancelUrl: `${baseUrl}/booking/manage/${manageToken}?action=cancel`,
          rescheduleUrl: `${baseUrl}/booking/manage/${manageToken}?action=reschedule`,
        });
        this.logger.log(`Email confirmation sent to ${appointment.customer.email}`);
      } catch (error) {
        this.logger.warn(`Email not sent: ${error.message}`);
      }
    }
  }

  private async sendCancellationNotifications(appointment: {
    customer: { name: string; phone: string; email: string | null };
    service: { name: string } | null;
    scheduledAt: Date;
    duration: number;
    tenant: { name: string; email: string; phone: string | null };
  }) {
    // Send email
    if (appointment.customer.email) {
      await this.emailService.sendBookingCancellation({
        customerName: appointment.customer.name,
        customerEmail: appointment.customer.email,
        serviceName: appointment.service?.name || 'Appointment',
        scheduledAt: appointment.scheduledAt,
        duration: appointment.duration,
        businessName: appointment.tenant.name,
        businessEmail: appointment.tenant.email,
        businessPhone: appointment.tenant.phone || undefined,
      });
    }
  }

  private async sendRescheduleNotifications(
    appointment: {
      customer: { name: string; phone: string; email: string | null };
      service: { name: string } | null;
      scheduledAt: Date;
      duration: number;
      tenant: { name: string; email: string; phone: string | null };
    },
    oldScheduledAt: Date,
  ) {
    // Send email
    if (appointment.customer.email) {
      await this.emailService.sendBookingRescheduled(
        {
          customerName: appointment.customer.name,
          customerEmail: appointment.customer.email,
          serviceName: appointment.service?.name || 'Appointment',
          scheduledAt: appointment.scheduledAt,
          duration: appointment.duration,
          businessName: appointment.tenant.name,
          businessEmail: appointment.tenant.email,
          businessPhone: appointment.tenant.phone || undefined,
        },
        oldScheduledAt,
      );
    }
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
