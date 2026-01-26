import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import { MaintenanceAlertStatus, AlertPriority } from '@prisma/client';

export interface AlertFilters {
  customerId?: string;
  equipmentId?: string;
  status?: MaintenanceAlertStatus | MaintenanceAlertStatus[];
  priority?: AlertPriority | AlertPriority[];
  dueBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface AlertSummary {
  total: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  dueThisWeek: number;
  overdue: number;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async findAll(tenantId: string, filters?: AlertFilters) {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.equipmentId) {
      where.equipmentId = filters.equipmentId;
    }
    if (filters?.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }
    if (filters?.priority) {
      where.priority = Array.isArray(filters.priority)
        ? { in: filters.priority }
        : filters.priority;
    }
    if (filters?.dueBefore) {
      where.dueDate = { lte: filters.dueBefore };
    }

    return this.prisma.maintenanceAlert.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            equipmentType: true,
            brand: true,
            model: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  async findById(tenantId: string, id: string) {
    const alert = await this.prisma.maintenanceAlert.findFirst({
      where: { id, tenantId },
      include: {
        equipment: {
          include: {
            customer: { select: { name: true, phone: true, email: true } },
            serviceHistory: {
              orderBy: { serviceDate: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    return alert;
  }

  async getSummary(tenantId: string): Promise<AlertSummary> {
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    const alerts = await this.prisma.maintenanceAlert.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'NOTIFIED'] },
      },
      select: {
        priority: true,
        status: true,
        dueDate: true,
      },
    });

    const byPriority: Record<string, number> = {
      URGENT: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    const byStatus: Record<string, number> = {};
    let dueThisWeek = 0;
    let overdue = 0;

    for (const alert of alerts) {
      byPriority[alert.priority] = (byPriority[alert.priority] || 0) + 1;
      byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;

      if (alert.dueDate) {
        if (alert.dueDate < now) {
          overdue++;
        } else if (alert.dueDate <= oneWeekFromNow) {
          dueThisWeek++;
        }
      }
    }

    return {
      total: alerts.length,
      byPriority,
      byStatus,
      dueThisWeek,
      overdue,
    };
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: MaintenanceAlertStatus,
    metadata?: Record<string, unknown>
  ) {
    await this.findById(tenantId, id);

    return this.prisma.maintenanceAlert.update({
      where: { id },
      data: {
        status,
        ...metadata,
      },
    });
  }

  async dismiss(tenantId: string, id: string, reason?: string) {
    await this.findById(tenantId, id);

    return this.prisma.maintenanceAlert.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        dismissedAt: new Date(),
        dismissReason: reason,
      },
    });
  }

  async markNotified(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'NOTIFIED');
  }

  async markScheduled(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'SCHEDULED');
  }

  async markCompleted(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'COMPLETED');
  }

  async convertToCampaign(tenantId: string, alertIds: string[]) {
    // Create outbound campaign for selected alerts
    const alerts = await this.prisma.maintenanceAlert.findMany({
      where: {
        id: { in: alertIds },
        tenantId,
        status: { in: ['PENDING', 'NOTIFIED'] },
      },
      include: {
        equipment: {
          include: {
            customer: { select: { id: true, phone: true, name: true } },
          },
        },
      },
    });

    if (alerts.length === 0) {
      throw new NotFoundException('No valid alerts found for campaign');
    }

    // Create the campaign
    const campaign = await this.prisma.outboundCampaign.create({
      data: {
        tenantId,
        name: `Maintenance Reminder - ${new Date().toLocaleDateString()}`,
        type: 'MAINTENANCE_REMINDER',
        status: 'DRAFT',
        targetCount: alerts.length,
        template: this.buildCampaignTemplate(),
      },
    });

    // Create outbound calls for each customer
    for (const alert of alerts) {
      if (!alert.equipment?.customer) continue;

      await this.prisma.outboundCall.create({
        data: {
          campaignId: campaign.id,
          customerId: alert.equipment.customer.id,
          customerPhone: alert.equipment.customer.phone,
          status: 'PENDING',
        },
      });

      // Update alert with campaign reference
      await this.prisma.maintenanceAlert.update({
        where: { id: alert.id },
        data: { convertedToCampaign: campaign.id },
      });
    }

    this.logger.log(`Created campaign ${campaign.id} from ${alerts.length} maintenance alerts`);

    return campaign;
  }

  async getAlertsByCustomer(tenantId: string, customerId: string) {
    return this.prisma.maintenanceAlert.findMany({
      where: {
        tenantId,
        customerId,
        status: { in: ['PENDING', 'NOTIFIED', 'SCHEDULED'] },
      },
      include: {
        equipment: {
          select: {
            equipmentType: true,
            brand: true,
            model: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async bulkUpdateStatus(
    tenantId: string,
    alertIds: string[],
    status: MaintenanceAlertStatus
  ) {
    const result = await this.prisma.maintenanceAlert.updateMany({
      where: {
        id: { in: alertIds },
        tenantId,
      },
      data: { status },
    });

    this.logger.log(`Bulk updated ${result.count} alerts to status ${status}`);
    return result;
  }

  async getUpcomingAlerts(tenantId: string, days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.maintenanceAlert.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'NOTIFIED'] },
        dueDate: { lte: futureDate },
      },
      include: {
        equipment: {
          include: {
            customer: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  private buildCampaignTemplate(): string {
    return `Hi {customerName}, this is a maintenance reminder from {businessName}. ` +
      `Your {equipmentType} is due for service. ` +
      `Would you like to schedule a maintenance appointment?`;
  }
}
