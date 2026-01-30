import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { AppointmentsValidatorsService } from './appointments-validators.service';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class AppointmentsSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validators: AppointmentsValidatorsService,
    private readonly scheduling: SchedulingService,
  ) {}

  async getAvailableSlots(tenantId: string, dto: AvailableSlotsDto) {
    const date = new Date(dto.date);
    const { startOfDay, endOfDay } = this.scheduling.getDayBounds(date);

    let duration = 60;
    let bufferMinutes = 0;
    if (dto.serviceId) {
      const service = await this.validators.validateService(
        tenantId,
        dto.serviceId,
      );
      duration = service.durationMinutes;
      bufferMinutes = service.bufferMinutes || 0;
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

    const availabilityWindow = await this.scheduling.resolveAvailabilityWindow({
      tenantId,
      date,
      assignedTo: dto.assignedTo,
      fallbackToDefault: !dto.assignedTo,
    });

    if (!availabilityWindow.hasAvailability) {
      return [];
    }

    const blockedRanges = this.scheduling.buildBlockedRanges(
      existingAppointments,
      bufferMinutes,
    );

    const slots = this.scheduling.generateSlots({
      date,
      startMinutes: availabilityWindow.startMinutes,
      endMinutes: availabilityWindow.endMinutes,
      duration,
      blockedRanges,
    });

    return slots
      .filter((slot) => slot.available)
      .map((slot) => ({
        start: slot.startDate.toISOString(),
        end: slot.endDate.toISOString(),
      }));
  }
}
