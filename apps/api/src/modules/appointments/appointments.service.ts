import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import {
  EVENTS,
  AppointmentEventPayload,
} from '../../config/events/events.types';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';
import { AppointmentsValidatorsService } from './appointments-validators.service';
import { ReminderSchedulerService } from '../noshow-prevention/reminder-scheduler.service';
import { NoshowPreventionService } from '../noshow-prevention/noshow-prevention.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validators: AppointmentsValidatorsService,
    private readonly eventsService: EventsService,
    private readonly reminderScheduler: ReminderSchedulerService,
    private readonly noshowService: NoshowPreventionService,
  ) {}

  async findAll(tenantId: string, filters?: AppointmentFilterDto) {
    const where: any = { tenantId };

    if (filters?.startDate && filters?.endDate) {
      where.scheduledAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, noShowCount: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        service: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async create(tenantId: string, dto: CreateAppointmentDto) {
    await this.validators.validateCustomer(tenantId, dto.customerId);

    let duration = dto.duration || 60;

    if (dto.serviceId) {
      const service = await this.validators.validateService(
        tenantId,
        dto.serviceId,
      );
      duration = service.durationMinutes;
    }

    if (dto.assignedTo) {
      await this.validators.validateUser(tenantId, dto.assignedTo);
    }

    const scheduledAt = new Date(dto.scheduledAt);
    await this.validators.checkSchedulingConflicts(
      tenantId,
      scheduledAt,
      duration,
      dto.assignedTo,
    );

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        assignedTo: dto.assignedTo,
        scheduledAt,
        duration,
        notes: dto.notes,
        status: 'SCHEDULED',
      },
      include: {
        customer: true,
        service: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    this.eventsService.emit<AppointmentEventPayload>(
      EVENTS.APPOINTMENT_CREATED,
      this.buildEventPayload(tenantId, appointment),
    );

    await this.reminderScheduler.scheduleReminders(appointment.id, tenantId);

    return appointment;
  }

  async update(tenantId: string, id: string, dto: UpdateAppointmentDto) {
    const existing = await this.findById(tenantId, id);

    if (dto.customerId) {
      await this.validators.validateCustomer(tenantId, dto.customerId);
    }

    if (dto.serviceId) {
      await this.validators.validateService(tenantId, dto.serviceId);
    }

    if (dto.assignedTo) {
      await this.validators.validateUser(tenantId, dto.assignedTo);
    }

    if (dto.scheduledAt || dto.duration || dto.assignedTo) {
      const scheduledAt = dto.scheduledAt
        ? new Date(dto.scheduledAt)
        : existing.scheduledAt;
      const duration = dto.duration || existing.duration;
      const assignedTo = dto.assignedTo || existing.assignedTo || undefined;

      await this.validators.checkSchedulingConflicts(
        tenantId,
        scheduledAt,
        duration,
        assignedTo,
        id,
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id: existing.id },
      data: {
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        assignedTo: dto.assignedTo,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        duration: dto.duration,
        notes: dto.notes,
        status: dto.status,
      },
      include: {
        customer: true,
        service: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    this.eventsService.emit<AppointmentEventPayload>(
      EVENTS.APPOINTMENT_UPDATED,
      this.buildEventPayload(tenantId, updated),
    );

    if (dto.scheduledAt) {
      await this.reminderScheduler.cancelReminders(id);
      await this.reminderScheduler.scheduleReminders(id, tenantId);
    }

    return updated;
  }

  async cancel(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    const cancelled = await this.prisma.appointment.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED' },
      include: {
        customer: true,
        service: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    this.eventsService.emit<AppointmentEventPayload>(
      EVENTS.APPOINTMENT_CANCELLED,
      this.buildEventPayload(tenantId, cancelled),
    );

    await this.reminderScheduler.cancelReminders(id);

    return cancelled;
  }

  async markNoShow(tenantId: string, id: string) {
    return this.noshowService.markNoShow(id, tenantId);
  }

  private buildEventPayload(
    tenantId: string,
    appointment: {
      id: string;
      customer: { id: string; name: string; phone: string; email?: string | null };
      service?: { name: string } | null;
      scheduledAt: Date;
      assignedUser?: { id: string; name: string } | null;
    },
  ): Omit<AppointmentEventPayload, 'timestamp' | 'correlationId'> {
    return {
      tenantId,
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
      customerName: appointment.customer.name,
      customerPhone: appointment.customer.phone,
      customerEmail: appointment.customer.email || undefined,
      scheduledAt: appointment.scheduledAt,
      serviceName: appointment.service?.name,
      assignedToId: appointment.assignedUser?.id,
      assignedToName: appointment.assignedUser?.name,
    };
  }
}
