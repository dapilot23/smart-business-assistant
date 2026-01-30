import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

type ServiceAvailability = {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
};

type AvailabilityWindow = {
  startMinutes: number;
  endMinutes: number;
  hasAvailability: boolean;
};

type BlockedRange = {
  start: number;
  end: number;
};

type SlotAvailability = {
  startMinutes: number;
  endMinutes: number;
  startDate: Date;
  endDate: Date;
  timeLabel: string;
  available: boolean;
};

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAvailabilityWindow(options: {
    tenantId: string;
    date: Date;
    serviceAvailability?: ServiceAvailability[];
    assignedTo?: string;
    fallbackToDefault?: boolean;
  }): Promise<AvailabilityWindow> {
    const {
      tenantId,
      date,
      serviceAvailability = [],
      assignedTo,
      fallbackToDefault = true,
    } = options;
    const dayOfWeek = date.getDay();

    if (assignedTo) {
      const timeOff = await this.prisma.timeOff.findFirst({
        where: {
          tenantId,
          userId: assignedTo,
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });

      if (timeOff) {
        return { startMinutes: 0, endMinutes: 0, hasAvailability: false };
      }

      const availability = await this.prisma.technicianAvailability.findUnique({
        where: {
          tenantId_userId_dayOfWeek: {
            tenantId,
            userId: assignedTo,
            dayOfWeek,
          },
          isActive: true,
        },
        select: { startTime: true, endTime: true },
      });

      if (!availability) {
        return { startMinutes: 0, endMinutes: 0, hasAvailability: false };
      }

      return {
        startMinutes: this.parseTimeToMinutes(availability.startTime),
        endMinutes: this.parseTimeToMinutes(availability.endTime),
        hasAvailability: true,
      };
    }

    const serviceAvail = serviceAvailability.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isActive,
    );

    let startMinutes = 9 * 60;
    let endMinutes = 17 * 60;

    if (serviceAvail) {
      startMinutes = this.parseTimeToMinutes(serviceAvail.startTime);
      endMinutes = this.parseTimeToMinutes(serviceAvail.endTime);
      return { startMinutes, endMinutes, hasAvailability: true };
    }

    const techAvailability = await this.prisma.technicianAvailability.findMany({
      where: { tenantId, dayOfWeek, isActive: true },
      select: { startTime: true, endTime: true, userId: true },
    });

    if (techAvailability.length > 0) {
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

      if (activeTechAvail.length > 0) {
        startMinutes = this.getEarliestStartMinutes(activeTechAvail);
        endMinutes = this.getLatestEndMinutes(activeTechAvail);
        return { startMinutes, endMinutes, hasAvailability: true };
      }
    }

    if (!fallbackToDefault) {
      return { startMinutes: 0, endMinutes: 0, hasAvailability: false };
    }

    return { startMinutes, endMinutes, hasAvailability: true };
  }

  getDayBounds(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
  }

  buildBlockedRanges(
    appointments: { scheduledAt: Date; duration: number }[],
    bufferMinutes: number,
  ): BlockedRange[] {
    const buffer = bufferMinutes || 0;
    return appointments.map((a) => {
      const start = a.scheduledAt.getHours() * 60 + a.scheduledAt.getMinutes();
      const end = start + a.duration + buffer;
      return { start, end };
    });
  }

  isSlotBlocked(
    slotStart: number,
    slotEnd: number,
    blockedRanges: BlockedRange[],
  ): boolean {
    return blockedRanges.some(
      (range) => slotStart < range.end && slotEnd > range.start,
    );
  }

  generateSlots(options: {
    date: Date;
    startMinutes: number;
    endMinutes: number;
    duration: number;
    minBookingTime?: Date;
    blockedRanges: BlockedRange[];
    slotInterval?: number;
  }): SlotAvailability[] {
    const {
      date,
      startMinutes,
      endMinutes,
      duration,
      minBookingTime,
      blockedRanges,
      slotInterval = 30,
    } = options;

    const slots: SlotAvailability[] = [];
    const minimumTime =
      minBookingTime && !Number.isNaN(minBookingTime.getTime())
        ? minBookingTime
        : null;

    for (
      let slotStart = startMinutes;
      slotStart + duration <= endMinutes;
      slotStart += slotInterval
    ) {
      const hour = Math.floor(slotStart / 60);
      const minute = slotStart % 60;
      const startDate = new Date(date);
      startDate.setHours(hour, minute, 0, 0);

      if (minimumTime && startDate < minimumTime) {
        continue;
      }

      const slotEnd = slotStart + duration;
      const endDate = new Date(startDate.getTime() + duration * 60000);
      const available = !this.isSlotBlocked(slotStart, slotEnd, blockedRanges);

      slots.push({
        startMinutes: slotStart,
        endMinutes: slotEnd,
        startDate,
        endDate,
        timeLabel: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        available,
      });
    }

    return slots;
  }

  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  private getEarliestStartMinutes(
    availability: { startTime: string }[],
  ): number {
    return availability.reduce((min, a) => {
      const minutes = this.parseTimeToMinutes(a.startTime);
      return minutes < min ? minutes : min;
    }, 24 * 60);
  }

  private getLatestEndMinutes(availability: { endTime: string }[]): number {
    return availability.reduce((max, a) => {
      const minutes = this.parseTimeToMinutes(a.endTime);
      return minutes > max ? minutes : max;
    }, 0);
  }
}
