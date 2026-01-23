import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class AppointmentsValidatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async validateCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (customer.tenantId !== tenantId) {
      throw new ForbiddenException('Customer belongs to different tenant');
    }

    return customer;
  }

  async validateService(tenantId: string, serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new BadRequestException('Service not found');
    }

    if (service.tenantId !== tenantId) {
      throw new ForbiddenException('Service belongs to different tenant');
    }

    return service;
  }

  async validateUser(tenantId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.tenantId !== tenantId) {
      throw new ForbiddenException('User belongs to different tenant');
    }

    return user;
  }

  async checkSchedulingConflicts(
    tenantId: string,
    scheduledAt: Date,
    duration: number,
    assignedTo?: string,
    excludeId?: string
  ) {
    if (!assignedTo) return;

    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    const conflicts = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        assignedTo,
        id: excludeId ? { not: excludeId } : undefined,
        status: { not: 'CANCELLED' },
        scheduledAt: { lt: endTime },
      },
    });

    const hasConflict = conflicts.some((apt) => {
      const aptEnd = new Date(apt.scheduledAt.getTime() + apt.duration * 60000);
      return scheduledAt < aptEnd;
    });

    if (hasConflict) {
      throw new ConflictException('Scheduling conflict detected');
    }
  }
}
