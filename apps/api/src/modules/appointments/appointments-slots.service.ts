import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { AppointmentsValidatorsService } from './appointments-validators.service';

@Injectable()
export class AppointmentsSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validators: AppointmentsValidatorsService,
  ) {}

  async getAvailableSlots(tenantId: string, dto: AvailableSlotsDto) {
    const date = new Date(dto.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    let duration = 60;
    if (dto.serviceId) {
      const service = await this.validators.validateService(
        tenantId,
        dto.serviceId,
      );
      duration = service.durationMinutes;
    }

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        assignedTo: dto.assignedTo || undefined,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
      select: { scheduledAt: true, duration: true },
    });

    const technicianAvailability = dto.assignedTo
      ? await this.getTechnicianAvailability(
          tenantId,
          dto.assignedTo,
          startOfDay,
        )
      : null;

    return this.calculateAvailableSlots(
      startOfDay,
      endOfDay,
      existingAppointments,
      duration,
      technicianAvailability,
    );
  }

  private calculateAvailableSlots(
    startOfDay: Date,
    endOfDay: Date,
    existingAppointments: any[],
    duration: number,
    technicianAvailability?: { startTime: string; endTime: string } | null,
  ) {
    const slots: Array<{ start: string; end: string }> = [];
    let workStartHour = 9;
    let workEndHour = 17;
    const slotInterval = 30;

    if (technicianAvailability) {
      const [startHour, startMin] = technicianAvailability.startTime
        .split(':')
        .map(Number);
      const [endHour, endMin] = technicianAvailability.endTime
        .split(':')
        .map(Number);
      workStartHour = startHour + startMin / 60;
      workEndHour = endHour + endMin / 60;
    }

    const current = new Date(startOfDay);
    const startMinutes = Math.floor((workStartHour % 1) * 60);
    current.setHours(Math.floor(workStartHour), startMinutes, 0, 0);

    const workEnd = new Date(startOfDay);
    const endMinutes = Math.floor((workEndHour % 1) * 60);
    workEnd.setHours(Math.floor(workEndHour), endMinutes, 0, 0);

    while (current < workEnd) {
      const slotEnd = new Date(current.getTime() + duration * 60000);

      if (slotEnd <= workEnd) {
        const isAvailable = !this.hasConflict(
          current,
          slotEnd,
          existingAppointments,
        );

        if (isAvailable) {
          slots.push({
            start: current.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }

      current.setMinutes(current.getMinutes() + slotInterval);
    }

    return slots;
  }

  private hasConflict(
    start: Date,
    end: Date,
    appointments: any[],
  ): boolean {
    return appointments.some((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
      return start < aptEnd && end > aptStart;
    });
  }

  private async getTechnicianAvailability(
    tenantId: string,
    userId: string,
    date: Date,
  ) {
    const dayOfWeek = date.getDay();

    const timeOff = await this.prisma.timeOff.findFirst({
      where: {
        tenantId,
        userId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (timeOff) {
      return null;
    }

    const availability = await this.prisma.technicianAvailability.findUnique({
      where: {
        tenantId_userId_dayOfWeek: {
          tenantId,
          userId,
          dayOfWeek,
        },
        isActive: true,
      },
      select: { startTime: true, endTime: true },
    });

    return availability;
  }
}
