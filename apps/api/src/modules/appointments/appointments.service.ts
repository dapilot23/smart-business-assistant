import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';
import { AppointmentsValidatorsService } from './appointments-validators.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validators: AppointmentsValidatorsService,
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
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        service: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
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

    return this.prisma.appointment.create({
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

    return this.prisma.appointment.update({
      where: { id },
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
  }

  async cancel(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        customer: true,
        service: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
