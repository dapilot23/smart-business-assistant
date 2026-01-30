import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class BusinessHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async isWithinBusinessHours(tenantId: string, date = new Date()): Promise<boolean> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { businessHours: true, timezone: true },
    });

    if (!settings?.businessHours) {
      return true;
    }

    const timeZone = settings.timezone || 'America/New_York';
    const { dayKey, minutes } = this.getLocalDayTime(date, timeZone);
    const hours = settings.businessHours as Record<string, { start: string; end: string }>;
    const window = hours?.[dayKey];

    if (!window?.start || !window?.end) {
      return false;
    }

    const start = this.toMinutes(window.start);
    const end = this.toMinutes(window.end);
    return minutes >= start && minutes <= end;
  }

  private getLocalDayTime(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Monday';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return { dayKey: weekday.toLowerCase(), minutes: hour * 60 + minute };
  }

  private toMinutes(value: string) {
    const [hour, minute] = value.split(':').map((v) => parseInt(v, 10));
    return hour * 60 + minute;
  }
}
