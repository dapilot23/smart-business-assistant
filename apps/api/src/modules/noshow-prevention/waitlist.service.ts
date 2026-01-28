import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async addToWaitlist(dto: CreateWaitlistDto, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (dto.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: dto.serviceId, tenantId },
      });
      if (!service) {
        throw new BadRequestException('Service not found');
      }
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.waitlist.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
        preferredStart: dto.preferredStart,
        preferredEnd: dto.preferredEnd,
        notes: dto.notes,
        expiresAt,
        status: 'WAITING',
      },
      include: { customer: true, service: true },
    });
  }

  async getWaitlist(tenantId: string, status?: string) {
    return this.prisma.waitlist.findMany({
      where: {
        tenantId,
        status: status || 'WAITING',
        expiresAt: { gte: new Date() },
      },
      include: { customer: true, service: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async notifyWaitlistForSlot(
    tenantId: string,
    serviceId: string | null,
    scheduledAt: Date,
    duration: number,
  ) {
    if (!serviceId) return null;

    const entry = await this.prisma.waitlist.findFirst({
      where: {
        tenantId,
        serviceId,
        status: 'WAITING',
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      include: { customer: true, service: true },
    });

    if (!entry) return null;

    const dateStr = scheduledAt.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const timeStr = scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });

    await this.notifications.queueSms(
      entry.customer.phone,
      `Good news! A ${entry.service?.name || 'service'} slot opened up on ${dateStr} at ${timeStr}. ` +
        `Call us to claim it (first come, first served).`,
      tenantId,
    );

    await this.prisma.waitlist.update({
      where: { id: entry.id },
      data: { status: 'OFFERED', notifiedAt: new Date() },
    });

    this.logger.log(`Waitlist entry ${entry.id} notified for slot`);
    return entry;
  }

  async confirmWaitlistBooking(waitlistId: string, tenantId: string) {
    const entry = await this.prisma.waitlist.findUnique({
      where: { id: waitlistId },
      include: { customer: true, service: true },
    });

    if (!entry || entry.tenantId !== tenantId) {
      throw new NotFoundException('Waitlist entry not found');
    }

    if (entry.status !== 'OFFERED') {
      throw new BadRequestException('Entry has not been offered a slot');
    }

    await this.prisma.waitlist.update({
      where: { id: waitlistId },
      data: { status: 'BOOKED' },
    });

    this.logger.log(`Waitlist entry ${waitlistId} confirmed as booked`);

    return { success: true, waitlistId, customerId: entry.customerId };
  }

  async removeFromWaitlist(waitlistId: string, tenantId: string) {
    const entry = await this.prisma.waitlist.findUnique({
      where: { id: waitlistId },
    });

    if (!entry || entry.tenantId !== tenantId) {
      throw new NotFoundException('Waitlist entry not found');
    }

    return this.prisma.waitlist.update({
      where: { id: waitlistId },
      data: { status: 'CANCELLED' },
    });
  }
}
