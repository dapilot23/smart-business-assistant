import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EquipmentCondition, Prisma } from '@prisma/client';

export interface CreateEquipmentDto {
  customerId: string;
  equipmentType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  installDate?: Date;
  warrantyExpiry?: Date;
  condition?: EquipmentCondition;
  notes?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateEquipmentDto extends Partial<CreateEquipmentDto> {
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  isActive?: boolean;
}

export interface AddServiceHistoryDto {
  serviceDate: Date;
  serviceType: string;
  description?: string;
  cost?: number;
  partsReplaced?: string;
  technicianId?: string;
  technicianName?: string;
  condition?: EquipmentCondition;
  notes?: string;
  jobId?: string;
}

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateEquipmentDto) {
    const equipment = await this.prisma.customerEquipment.create({
      data: {
        tenantId,
        ...dto,
      },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });

    this.logger.log(`Created equipment ${equipment.id} for customer ${dto.customerId}`);
    return equipment;
  }

  async findAll(tenantId: string, options?: {
    customerId?: string;
    equipmentType?: string;
    condition?: EquipmentCondition;
    needsService?: boolean;
    limit?: number;
  }) {
    const where: Record<string, unknown> = { tenantId, isActive: true };

    if (options?.customerId) {
      where.customerId = options.customerId;
    }
    if (options?.equipmentType) {
      where.equipmentType = options.equipmentType;
    }
    if (options?.condition) {
      where.condition = options.condition;
    }
    if (options?.needsService) {
      where.OR = [
        { nextServiceDue: { lte: new Date() } },
        { condition: { in: ['FAIR', 'POOR', 'CRITICAL'] } },
      ];
    }

    return this.prisma.customerEquipment.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        _count: { select: { serviceHistory: true, alerts: true } },
      },
      orderBy: [
        { condition: 'desc' },  // Critical first
        { nextServiceDue: 'asc' },
      ],
      take: options?.limit || 100,
    });
  }

  async findById(tenantId: string, id: string) {
    const equipment = await this.prisma.customerEquipment.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true, phone: true, email: true, address: true } },
        serviceHistory: {
          orderBy: { serviceDate: 'desc' },
          take: 10,
        },
        alerts: {
          where: { status: { in: ['PENDING', 'NOTIFIED'] } },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment ${id} not found`);
    }

    return equipment;
  }

  async findByCustomer(tenantId: string, customerId: string) {
    return this.prisma.customerEquipment.findMany({
      where: { tenantId, customerId, isActive: true },
      include: {
        serviceHistory: {
          orderBy: { serviceDate: 'desc' },
          take: 3,
        },
        alerts: {
          where: { status: 'PENDING' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEquipmentDto) {
    await this.findById(tenantId, id);  // Verify exists

    // Extract only valid update fields (exclude customerId as it's a relation field)
    const { customerId, ...updateData } = dto;

    return this.prisma.customerEquipment.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });
  }

  async addServiceHistory(tenantId: string, equipmentId: string, dto: AddServiceHistoryDto) {
    const equipment = await this.findById(tenantId, equipmentId);

    // Create service history entry
    const history = await this.prisma.equipmentServiceHistory.create({
      data: {
        equipmentId,
        tenantId,
        ...dto,
      },
    });

    // Update equipment's last service date and condition
    await this.prisma.customerEquipment.update({
      where: { id: equipmentId },
      data: {
        lastServiceDate: dto.serviceDate,
        condition: dto.condition || equipment.condition,
        nextServiceDue: this.calculateNextServiceDue(equipment.equipmentType, dto.serviceDate),
      },
    });

    this.logger.log(`Added service history ${history.id} to equipment ${equipmentId}`);
    return history;
  }

  async getServiceHistory(tenantId: string, equipmentId: string, limit = 20) {
    await this.findById(tenantId, equipmentId);  // Verify exists

    return this.prisma.equipmentServiceHistory.findMany({
      where: { equipmentId, tenantId },
      orderBy: { serviceDate: 'desc' },
      take: limit,
    });
  }

  async deactivate(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.prisma.customerEquipment.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated equipment ${id}`);
  }

  async getEquipmentTypes(tenantId: string) {
    const types = await this.prisma.customerEquipment.groupBy({
      by: ['equipmentType'],
      where: { tenantId },
      _count: { equipmentType: true },
    });

    return types.map(t => ({
      type: t.equipmentType,
      count: t._count.equipmentType,
    }));
  }

  async getConditionSummary(tenantId: string) {
    const conditions = await this.prisma.customerEquipment.groupBy({
      by: ['condition'],
      where: { tenantId, isActive: true },
      _count: { condition: true },
    });

    return conditions.map(c => ({
      condition: c.condition,
      count: c._count.condition,
    }));
  }

  private calculateNextServiceDue(equipmentType: string, lastServiceDate: Date): Date {
    const intervalMonths: Record<string, number> = {
      'HVAC': 6,
      'Furnace': 12,
      'Air Conditioner': 12,
      'Water Heater': 12,
      'Plumbing': 24,
      'Electrical': 24,
      'Appliance': 12,
    };

    const months = intervalMonths[equipmentType] || 12;
    const nextDue = new Date(lastServiceDate);
    nextDue.setMonth(nextDue.getMonth() + months);
    return nextDue;
  }
}
