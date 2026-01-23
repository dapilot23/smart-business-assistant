import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { InvoiceStatus, AppointmentStatus, JobStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalRevenue,
      totalAppointments,
      totalCustomers,
      totalCalls,
      pendingQuotes,
      jobsInProgress,
    ] = await Promise.all([
      this.getMonthlyRevenue(tenantId, startOfMonth, endOfMonth),
      this.countMonthlyAppointments(tenantId, startOfMonth, endOfMonth),
      this.countTotalCustomers(tenantId),
      this.countTotalCalls(tenantId),
      this.countPendingQuotes(tenantId),
      this.countJobsInProgress(tenantId),
    ]);

    return {
      totalRevenue,
      totalAppointments,
      totalCustomers,
      totalCalls,
      pendingQuotes,
      jobsInProgress,
    };
  }

  async getRevenueChart(tenantId: string, period: string = '30d') {
    const { startDate, endDate, groupBy } = this.getPeriodDates(period);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: InvoiceStatus.PAID,
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
      orderBy: { paidAt: 'asc' },
    });

    return this.groupRevenueByPeriod(invoices, groupBy, startDate, endDate);
  }

  async getAppointmentStats(tenantId: string, period: string = '30d') {
    const { startDate, endDate } = this.getPeriodDates(period);

    const appointments = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: {
        tenantId,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        status: true,
      },
    });

    return appointments.map((item) => ({
      status: item.status,
      count: item._count.status,
    }));
  }

  async getTopServices(tenantId: string, limit: number = 10) {
    const services = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        tenantId,
        serviceId: { not: null },
      },
      _count: {
        serviceId: true,
      },
      orderBy: {
        _count: {
          serviceId: 'desc',
        },
      },
      take: limit,
    });

    const serviceDetails = await this.prisma.service.findMany({
      where: {
        id: { in: services.map((s) => s.serviceId).filter(Boolean) as string[] },
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    return services.map((item) => {
      const service = serviceDetails.find((s) => s.id === item.serviceId);
      return {
        serviceId: item.serviceId,
        serviceName: service?.name || 'Unknown',
        price: service?.price || 0,
        bookings: item._count.serviceId,
      };
    });
  }

  async getTeamPerformance(tenantId: string) {
    const jobs = await this.prisma.job.groupBy({
      by: ['technicianId'],
      where: {
        tenantId,
        status: JobStatus.COMPLETED,
        technicianId: { not: null },
      },
      _count: {
        technicianId: true,
      },
      orderBy: {
        _count: {
          technicianId: 'desc',
        },
      },
    });

    const technicianIds = jobs.map((j) => j.technicianId).filter(Boolean) as string[];
    const technicians = await this.prisma.user.findMany({
      where: { id: { in: technicianIds } },
      select: { id: true, name: true, email: true },
    });

    return jobs.map((item) => {
      const technician = technicians.find((t) => t.id === item.technicianId);
      return {
        technicianId: item.technicianId,
        technicianName: technician?.name || 'Unknown',
        completedJobs: item._count.technicianId,
      };
    });
  }

  private async getMonthlyRevenue(tenantId: string, start: Date, end: Date) {
    const result = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        status: InvoiceStatus.PAID,
        paidAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  private async countMonthlyAppointments(tenantId: string, start: Date, end: Date) {
    return this.prisma.appointment.count({
      where: {
        tenantId,
        scheduledAt: { gte: start, lte: end },
      },
    });
  }

  private async countTotalCustomers(tenantId: string) {
    return this.prisma.customer.count({ where: { tenantId } });
  }

  private async countTotalCalls(tenantId: string) {
    return this.prisma.callLog.count({ where: { tenantId } });
  }

  private async countPendingQuotes(tenantId: string) {
    return this.prisma.quote.count({
      where: { tenantId, status: { in: ['DRAFT', 'SENT'] } },
    });
  }

  private async countJobsInProgress(tenantId: string) {
    return this.prisma.job.count({
      where: {
        tenantId,
        status: { in: [JobStatus.NOT_STARTED, JobStatus.EN_ROUTE, JobStatus.IN_PROGRESS] },
      },
    });
  }

  private getPeriodDates(period: string) {
    const now = new Date();
    let startDate: Date;
    let groupBy: 'day' | 'month';

    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupBy = 'day';
    } else if (period === '12m') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      groupBy = 'month';
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupBy = 'day';
    }

    return { startDate, endDate: now, groupBy };
  }

  private groupRevenueByPeriod(
    invoices: any[],
    groupBy: 'day' | 'month',
    startDate: Date,
    endDate: Date,
  ) {
    const grouped = new Map<string, number>();

    invoices.forEach((invoice) => {
      const date = new Date(invoice.paidAt);
      const key = groupBy === 'day'
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      grouped.set(key, (grouped.get(key) || 0) + invoice.amount);
    });

    return Array.from(grouped.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }
}
