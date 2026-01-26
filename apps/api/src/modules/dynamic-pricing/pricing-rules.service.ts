import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { PricingRuleType, Prisma } from '@prisma/client';

export interface CreatePricingRuleDto {
  name: string;
  description?: string;
  ruleType: PricingRuleType;
  conditions: Prisma.InputJsonValue;
  multiplierMin?: number;
  multiplierMax?: number;
  flatAdjustment?: number;
  priority?: number;
  startsAt?: Date;
  endsAt?: Date;
}

export interface UpdatePricingRuleDto extends Partial<CreatePricingRuleDto> {
  isActive?: boolean;
}

export interface CreateServicePricingDto {
  serviceId: string;
  basePrice: number;
  minPrice?: number;
  maxPrice?: number;
  urgentMultiplier?: number;
  emergencyMultiplier?: number;
  dynamicPricingEnabled?: boolean;
}

@Injectable()
export class PricingRulesService {
  private readonly logger = new Logger(PricingRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Pricing Rules ====================

  async createRule(tenantId: string, dto: CreatePricingRuleDto) {
    const rule = await this.prisma.pricingRule.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        ruleType: dto.ruleType,
        conditions: dto.conditions,
        multiplierMin: dto.multiplierMin ?? 1.0,
        multiplierMax: dto.multiplierMax ?? 1.5,
        flatAdjustment: dto.flatAdjustment,
        priority: dto.priority ?? 0,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
      },
    });

    this.logger.log(`Created pricing rule ${rule.id}: ${rule.name}`);
    return rule;
  }

  async listRules(tenantId: string, options?: {
    ruleType?: PricingRuleType;
    isActive?: boolean;
    includeStats?: boolean;
  }) {
    const where: Record<string, unknown> = { tenantId };

    if (options?.ruleType) {
      where.ruleType = options.ruleType;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.pricingRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getRule(tenantId: string, id: string) {
    const rule = await this.prisma.pricingRule.findFirst({
      where: { id, tenantId },
    });

    if (!rule) {
      throw new NotFoundException(`Pricing rule ${id} not found`);
    }

    return rule;
  }

  async updateRule(tenantId: string, id: string, dto: UpdatePricingRuleDto) {
    await this.getRule(tenantId, id);

    return this.prisma.pricingRule.update({
      where: { id },
      data: dto,
    });
  }

  async deleteRule(tenantId: string, id: string) {
    await this.getRule(tenantId, id);

    await this.prisma.pricingRule.delete({ where: { id } });
    this.logger.log(`Deleted pricing rule ${id}`);
  }

  async toggleRule(tenantId: string, id: string, isActive: boolean) {
    await this.getRule(tenantId, id);

    return this.prisma.pricingRule.update({
      where: { id },
      data: { isActive },
    });
  }

  async getRuleStats(tenantId: string) {
    const rules = await this.prisma.pricingRule.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        ruleType: true,
        isActive: true,
        appliedCount: true,
        totalRevenue: true,
      },
      orderBy: { totalRevenue: 'desc' },
    });

    const totalRevenue = rules.reduce((sum, r) => sum + r.totalRevenue, 0);
    const totalApplications = rules.reduce((sum, r) => sum + r.appliedCount, 0);

    return {
      rules,
      summary: {
        totalRules: rules.length,
        activeRules: rules.filter(r => r.isActive).length,
        totalApplications,
        totalRevenue,
      },
    };
  }

  // ==================== Service Pricing ====================

  async createServicePricing(tenantId: string, dto: CreateServicePricingDto) {
    return this.prisma.servicePricing.create({
      data: {
        tenantId,
        serviceId: dto.serviceId,
        basePrice: dto.basePrice,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        urgentMultiplier: dto.urgentMultiplier ?? 1.5,
        emergencyMultiplier: dto.emergencyMultiplier ?? 2.0,
        dynamicPricingEnabled: dto.dynamicPricingEnabled ?? true,
      },
    });
  }

  async getServicePricing(tenantId: string, serviceId: string) {
    return this.prisma.servicePricing.findUnique({
      where: {
        tenantId_serviceId: { tenantId, serviceId },
      },
    });
  }

  async updateServicePricing(
    tenantId: string,
    serviceId: string,
    dto: Partial<CreateServicePricingDto>
  ) {
    return this.prisma.servicePricing.upsert({
      where: {
        tenantId_serviceId: { tenantId, serviceId },
      },
      create: {
        tenantId,
        serviceId,
        basePrice: dto.basePrice ?? 0,
        ...dto,
      },
      update: dto,
    });
  }

  async listServicePricing(tenantId: string) {
    return this.prisma.servicePricing.findMany({
      where: { tenantId },
    });
  }

  // ==================== Rule Templates ====================

  getAvailableRuleTemplates(): Array<{
    type: PricingRuleType;
    name: string;
    description: string;
    defaultConditions: Record<string, unknown>;
    defaultMultipliers: { min: number; max: number };
  }> {
    return [
      {
        type: 'TIME_OF_DAY',
        name: 'Peak Hours Premium',
        description: 'Higher prices during busy morning/afternoon hours',
        defaultConditions: { startHour: 9, endHour: 17 },
        defaultMultipliers: { min: 1.0, max: 1.2 },
      },
      {
        type: 'TIME_OF_DAY',
        name: 'Off-Hours Discount',
        description: 'Discounted pricing for early morning or evening',
        defaultConditions: { startHour: 17, endHour: 20 },
        defaultMultipliers: { min: 0.85, max: 0.95 },
      },
      {
        type: 'DAY_OF_WEEK',
        name: 'Weekend Premium',
        description: 'Higher prices for weekend service',
        defaultConditions: { days: [0, 6] },  // Sunday, Saturday
        defaultMultipliers: { min: 1.2, max: 1.4 },
      },
      {
        type: 'DEMAND_BASED',
        name: 'High Demand Surge',
        description: 'Automatic price increase when demand is high',
        defaultConditions: { threshold: 0.7 },
        defaultMultipliers: { min: 1.0, max: 1.5 },
      },
      {
        type: 'URGENCY',
        name: 'Same-Day Service Premium',
        description: 'Premium for same-day and urgent requests',
        defaultConditions: { urgencyLevels: ['SAME_DAY', 'URGENT'] },
        defaultMultipliers: { min: 1.3, max: 1.5 },
      },
      {
        type: 'EARLY_BIRD',
        name: 'Advance Booking Discount',
        description: 'Discount for booking 7+ days in advance',
        defaultConditions: { daysInAdvance: 7 },
        defaultMultipliers: { min: 0.9, max: 0.95 },
      },
      {
        type: 'LOYALTY',
        name: 'Repeat Customer Discount',
        description: 'Discount for returning customers',
        defaultConditions: { minVisits: 2 },
        defaultMultipliers: { min: 0.9, max: 0.95 },
      },
      {
        type: 'SEASONAL',
        name: 'Holiday Premium',
        description: 'Premium pricing during holidays',
        defaultConditions: {
          holidays: ['christmas', 'thanksgiving', 'july4'],
        },
        defaultMultipliers: { min: 1.3, max: 1.5 },
      },
    ];
  }

  async createFromTemplate(
    tenantId: string,
    templateType: PricingRuleType,
    customizations?: Partial<CreatePricingRuleDto>
  ) {
    const templates = this.getAvailableRuleTemplates();
    const template = templates.find(t => t.type === templateType);

    if (!template) {
      throw new NotFoundException(`Template type ${templateType} not found`);
    }

    return this.createRule(tenantId, {
      name: customizations?.name ?? template.name,
      description: customizations?.description ?? template.description,
      ruleType: template.type,
      conditions: customizations?.conditions ?? (template.defaultConditions as Prisma.InputJsonValue),
      multiplierMin: customizations?.multiplierMin ?? template.defaultMultipliers.min,
      multiplierMax: customizations?.multiplierMax ?? template.defaultMultipliers.max,
      priority: customizations?.priority ?? 0,
    });
  }
}
