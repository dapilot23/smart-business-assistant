import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';
import { RetentionSequenceService } from './retention-sequence.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RetentionCronService {
  private readonly logger = new Logger(RetentionCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retentionSequenceService: RetentionSequenceService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 7 * * *')
  async detectDormantCustomers(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      include: { settings: true },
    });

    let totalProcessed = 0;

    for (const tenant of tenants) {
      if (tenant.settings?.retentionEnabled === false) continue;
      const count = await this.processTenantDormancy(tenant);
      totalProcessed += count;
    }

    this.logger.log(`Dormant detection complete: ${totalProcessed} customers processed`);
  }

  @Cron('0 8 * * *')
  async sendMaintenanceReminders(): Promise<void> {
    const intervals = await this.prisma.serviceInterval.findMany({
      include: { service: true, tenant: true },
    });

    let totalSent = 0;

    for (const interval of intervals) {
      const count = await this.processInterval(interval);
      totalSent += count;
    }

    this.logger.log(`Maintenance reminders complete: ${totalSent} sent`);
  }

  private async processTenantDormancy(tenant: any): Promise<number> {
    const dormantDays = tenant.settings?.retentionDormantDays ?? 90;
    const cutoffDate = new Date(
      Date.now() - dormantDays * 24 * 60 * 60 * 1000,
    );

    const customers = await this.findDormantCandidates(
      tenant.id,
      cutoffDate,
    );
    const dormant = this.filterDormant(customers, cutoffDate);

    for (const customer of dormant) {
      await this.markDormantAndCreateSequence(tenant.id, customer.id);
    }

    return dormant.length;
  }

  private async findDormantCandidates(
    tenantId: string,
    cutoffDate: Date,
  ): Promise<any[]> {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        lifecycleStage: { not: 'LOST' },
        appointments: { some: {} },
      },
      include: {
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { scheduledAt: true },
        },
        retentionCampaigns: {
          where: { status: 'PENDING' },
          take: 1,
        },
      },
    });
  }

  private filterDormant(customers: any[], cutoffDate: Date): any[] {
    return customers.filter(
      (c) =>
        c.appointments[0]?.scheduledAt < cutoffDate &&
        c.retentionCampaigns.length === 0,
    );
  }

  private async markDormantAndCreateSequence(
    tenantId: string,
    customerId: string,
  ): Promise<void> {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { lifecycleStage: 'DORMANT' },
    });
    await this.retentionSequenceService.createSequence(
      tenantId,
      customerId,
      'DORMANT_WINBACK',
    );
  }

  private async processInterval(interval: any): Promise<number> {
    const now = Date.now();
    const dueDate = new Date(
      now - interval.intervalDays * 24 * 60 * 60 * 1000,
    );

    const customers = await this.findDueCustomers(interval, dueDate);
    let sent = 0;

    for (const customer of customers) {
      if (!customer.phone) continue;
      const months = this.calcMonthsSince(interval.intervalDays);
      const message = this.buildReminderMessage(
        customer.name,
        interval.service.name,
        months,
      );
      await this.notifications.queueSms(
        customer.phone,
        message,
        interval.tenantId,
      );
      sent++;
    }

    return sent;
  }

  private async findDueCustomers(
    interval: any,
    dueDate: Date,
  ): Promise<any[]> {
    return this.prisma.customer.findMany({
      where: {
        tenantId: interval.tenantId,
        appointments: {
          some: {
            serviceId: interval.serviceId,
            scheduledAt: { lt: dueDate },
            status: 'COMPLETED',
          },
        },
      },
      include: {
        appointments: {
          where: {
            serviceId: interval.serviceId,
            status: 'COMPLETED',
          },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  private calcMonthsSince(intervalDays: number): number {
    return Math.round(intervalDays / 30);
  }

  private buildReminderMessage(
    name: string,
    serviceName: string,
    months: number,
  ): string {
    return (
      `Hi ${name}, it's been ${months} months since your last ` +
      `${serviceName}. Time for a check-up? Book here: [link]`
    );
  }
}
