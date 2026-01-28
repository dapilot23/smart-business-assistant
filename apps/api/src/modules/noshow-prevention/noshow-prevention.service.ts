import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class NoshowPreventionService {
  private readonly logger = new Logger(NoshowPreventionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async markNoShow(appointmentId: string, tenantId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    const [updated, customer] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'NO_SHOW' },
      }),
      this.prisma.customer.update({
        where: { id: appointment.customerId },
        data: { noShowCount: { increment: 1 } },
      }),
    ]);

    this.logger.log(
      `Marked appointment ${appointmentId} as no-show. Customer ${customer.id} count: ${customer.noShowCount}`,
    );

    return {
      appointmentId: updated.id,
      status: updated.status,
      noShowCount: customer.noShowCount,
    };
  }

  async isHighRisk(customerId: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { noShowCount: true },
    });

    return (customer?.noShowCount ?? 0) >= 2;
  }

  async getNoShowAnalytics(tenantId: string) {
    const noShows = await this.prisma.appointment.findMany({
      where: { tenantId, status: 'NO_SHOW' },
      include: { service: true, customer: true },
    });

    const total = await this.prisma.appointment.count({
      where: {
        tenantId,
        status: { in: ['COMPLETED', 'NO_SHOW'] },
      },
    });

    const noShowRate = total > 0 ? noShows.length / total : 0;

    const byService = this.groupByField(noShows, (a) => a.service?.name || 'Unknown');
    const byDayOfWeek = this.groupByField(noShows, (a) =>
      new Date(a.scheduledAt).toLocaleDateString('en-US', { weekday: 'long' }),
    );

    const repeatOffenders = await this.prisma.customer.findMany({
      where: { tenantId, noShowCount: { gte: 2 } },
      select: { id: true, name: true, phone: true, noShowCount: true },
      orderBy: { noShowCount: 'desc' },
      take: 10,
    });

    return {
      totalNoShows: noShows.length,
      noShowRate: Math.round(noShowRate * 1000) / 10,
      byService,
      byDayOfWeek,
      repeatOffenders,
    };
  }

  private groupByField<T>(
    items: T[],
    keyFn: (item: T) => string,
  ): Record<string, number> {
    return items.reduce(
      (acc, item) => {
        const key = keyFn(item);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
