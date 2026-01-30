import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';
import { UrgencyLevel, PricingRuleType } from '@prisma/client';
import { toNum } from '../../common/utils/decimal';

export interface PriceCalculationInput {
  tenantId: string;
  serviceId: string;
  customerId?: string;
  scheduledAt: Date;
  urgency: UrgencyLevel;
}

export interface PriceCalculationResult {
  basePrice: number;
  finalPrice: number;
  multiplier: number;
  appliedRules: AppliedRule[];
  demandFactor: number;
  urgencyMultiplier: number;
  breakdown: PriceBreakdown;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  ruleType: PricingRuleType;
  multiplier: number;
  adjustment: number;
}

export interface PriceBreakdown {
  base: number;
  demandAdjustment: number;
  urgencyAdjustment: number;
  timeOfDayAdjustment: number;
  loyaltyDiscount: number;
  total: number;
}

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate dynamic price for a service
   */
  async calculatePrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    // Get service pricing config
    const pricing = await this.prisma.servicePricing.findUnique({
      where: {
        tenantId_serviceId: {
          tenantId: input.tenantId,
          serviceId: input.serviceId,
        },
      },
    });

    // Fall back to service default price if no pricing config
    const service = await this.prisma.service.findUnique({
      where: { id: input.serviceId },
      select: { price: true },
    });

    const basePrice = toNum(pricing?.basePrice) || toNum(service?.price) || 0;
    const minPrice = toNum(pricing?.minPrice) || basePrice * 0.5;
    const maxPrice = toNum(pricing?.maxPrice) || basePrice * 3;
    const dynamicEnabled = pricing?.dynamicPricingEnabled ?? true;

    if (!dynamicEnabled) {
      return this.createStaticPriceResult(basePrice, input.urgency, pricing);
    }

    // Get applicable rules
    const rules = await this.getApplicableRules(input);

    // Calculate demand factor
    const demandFactor = await this.calculateDemandFactor(input.tenantId, input.scheduledAt);

    // Calculate urgency multiplier
    const urgencyMultiplier = this.getUrgencyMultiplier(input.urgency, pricing);

    // Apply rules
    const appliedRules: AppliedRule[] = [];
    let totalMultiplier = 1.0;
    let totalAdjustment = 0;

    for (const rule of rules) {
      const effect = this.evaluateRule(rule, input, demandFactor);
      if (effect.applies) {
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          multiplier: effect.multiplier,
          adjustment: effect.adjustment,
        });
        totalMultiplier *= effect.multiplier;
        totalAdjustment += effect.adjustment;
      }
    }

    // Calculate final price
    let finalPrice = basePrice * totalMultiplier * urgencyMultiplier * demandFactor + totalAdjustment;

    // Apply min/max constraints
    finalPrice = Math.max(minPrice, Math.min(maxPrice, finalPrice));
    finalPrice = Math.round(finalPrice * 100) / 100;

    // Calculate breakdown
    const breakdown: PriceBreakdown = {
      base: basePrice,
      demandAdjustment: basePrice * (demandFactor - 1),
      urgencyAdjustment: basePrice * urgencyMultiplier * (urgencyMultiplier - 1),
      timeOfDayAdjustment: this.calculateTimeAdjustment(appliedRules, basePrice),
      loyaltyDiscount: this.calculateLoyaltyDiscount(appliedRules, basePrice),
      total: finalPrice,
    };

    // Record quote history
    await this.recordQuoteHistory(input, basePrice, finalPrice, appliedRules, demandFactor);

    // Update rule usage stats
    await this.updateRuleStats(appliedRules.map(r => r.ruleId), finalPrice - basePrice);

    return {
      basePrice,
      finalPrice,
      multiplier: totalMultiplier,
      appliedRules,
      demandFactor,
      urgencyMultiplier,
      breakdown,
    };
  }

  /**
   * Get demand factor based on historical metrics
   */
  async calculateDemandFactor(tenantId: string, scheduledAt: Date): Promise<number> {
    const date = new Date(scheduledAt);
    date.setHours(0, 0, 0, 0);
    const hour = scheduledAt.getHours();
    const dayOfWeek = scheduledAt.getDay();

    // Get historical metrics for this time slot
    const metrics = await this.prisma.demandMetrics.findMany({
      where: {
        tenantId,
        dayOfWeek,
        hour,
      },
      orderBy: { date: 'desc' },
      take: 4, // Last 4 weeks
    });

    if (metrics.length === 0) {
      return 1.0; // No data, use base price
    }

    // Calculate average capacity utilization
    const avgCapacity = metrics.reduce((sum, m) => sum + m.capacityUsed, 0) / metrics.length;

    // Higher demand = higher multiplier
    // 0-50% capacity: 0.9-1.0 (slight discount)
    // 50-80% capacity: 1.0-1.2 (normal to slight premium)
    // 80-100% capacity: 1.2-1.5 (premium)
    if (avgCapacity < 0.5) {
      return 0.9 + (avgCapacity * 0.2);
    } else if (avgCapacity < 0.8) {
      return 1.0 + ((avgCapacity - 0.5) * 0.67);
    } else {
      return 1.2 + ((avgCapacity - 0.8) * 1.5);
    }
  }

  private getUrgencyMultiplier(
    urgency: UrgencyLevel,
    pricing?: { urgentMultiplier: any; emergencyMultiplier: any } | null
  ): number {
    const urgentMult = toNum(pricing?.urgentMultiplier) || 1.5;
    const emergencyMult = toNum(pricing?.emergencyMultiplier) || 2.0;

    switch (urgency) {
      case 'STANDARD':
        return 1.0;
      case 'NEXT_DAY':
        return 1.15;
      case 'SAME_DAY':
        return 1.3;
      case 'URGENT':
        return urgentMult;
      case 'EMERGENCY':
        return emergencyMult;
      default:
        return 1.0;
    }
  }

  private async getApplicableRules(input: PriceCalculationInput) {
    const now = new Date();

    return this.prisma.pricingRule.findMany({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
        ],
      },
      orderBy: { priority: 'desc' },
    });
  }

  private evaluateRule(
    rule: {
      ruleType: PricingRuleType;
      conditions: unknown;
      multiplierMin: any;
      multiplierMax: any;
      flatAdjustment: any;
    },
    input: PriceCalculationInput,
    demandFactor: number
  ): { applies: boolean; multiplier: number; adjustment: number } {
    const conditions = rule.conditions as Record<string, unknown>;
    const hour = input.scheduledAt.getHours();
    const dayOfWeek = input.scheduledAt.getDay();

    switch (rule.ruleType) {
      case 'TIME_OF_DAY': {
        const startHour = conditions.startHour as number;
        const endHour = conditions.endHour as number;
        if (hour >= startHour && hour < endHour) {
          return {
            applies: true,
            multiplier: this.interpolateMultiplier(rule, 0.5),
            adjustment: toNum(rule.flatAdjustment),
          };
        }
        break;
      }

      case 'DAY_OF_WEEK': {
        const days = conditions.days as number[];
        if (days?.includes(dayOfWeek)) {
          return {
            applies: true,
            multiplier: this.interpolateMultiplier(rule, 0.5),
            adjustment: toNum(rule.flatAdjustment),
          };
        }
        break;
      }

      case 'DEMAND_BASED': {
        const threshold = (conditions.threshold as number) ?? 0.7;
        if (demandFactor >= threshold) {
          const intensity = (demandFactor - threshold) / (1.5 - threshold);
          return {
            applies: true,
            multiplier: this.interpolateMultiplier(rule, Math.min(1, intensity)),
            adjustment: toNum(rule.flatAdjustment),
          };
        }
        break;
      }

      case 'URGENCY': {
        const urgencyLevels = conditions.urgencyLevels as string[];
        if (urgencyLevels?.includes(input.urgency)) {
          return {
            applies: true,
            multiplier: this.interpolateMultiplier(rule, 0.8),
            adjustment: toNum(rule.flatAdjustment),
          };
        }
        break;
      }

      case 'EARLY_BIRD': {
        const daysInAdvance = (conditions.daysInAdvance as number) ?? 7;
        const now = new Date();
        const diffDays = Math.floor(
          (input.scheduledAt.getTime() - now.getTime()) / 86400000
        );
        if (diffDays >= daysInAdvance) {
          return {
            applies: true,
            multiplier: toNum(rule.multiplierMin), // Discount, use min
            adjustment: toNum(rule.flatAdjustment),
          };
        }
        break;
      }

      case 'LOYALTY': {
        if (input.customerId) {
          // Check customer history
          // Simplified: would normally check CustomerContext
          return {
            applies: true,
            multiplier: toNum(rule.multiplierMin), // Discount
            adjustment: toNum(rule.flatAdjustment),
          };
        }
        break;
      }
    }

    return { applies: false, multiplier: 1.0, adjustment: 0 };
  }

  private interpolateMultiplier(
    rule: { multiplierMin: any; multiplierMax: any },
    intensity: number
  ): number {
    return toNum(rule.multiplierMin) + (toNum(rule.multiplierMax) - toNum(rule.multiplierMin)) * intensity;
  }

  private calculateTimeAdjustment(rules: AppliedRule[], basePrice: number): number {
    const timeRule = rules.find(r => r.ruleType === 'TIME_OF_DAY');
    if (timeRule) {
      return basePrice * (timeRule.multiplier - 1);
    }
    return 0;
  }

  private calculateLoyaltyDiscount(rules: AppliedRule[], basePrice: number): number {
    const loyaltyRule = rules.find(r => r.ruleType === 'LOYALTY');
    if (loyaltyRule && loyaltyRule.multiplier < 1) {
      return basePrice * (1 - loyaltyRule.multiplier);
    }
    return 0;
  }

  private createStaticPriceResult(
    basePrice: number,
    urgency: UrgencyLevel,
    pricing?: { urgentMultiplier: any; emergencyMultiplier: any } | null
  ): PriceCalculationResult {
    const urgencyMultiplier = this.getUrgencyMultiplier(urgency, pricing);
    const finalPrice = Math.round(basePrice * urgencyMultiplier * 100) / 100;

    return {
      basePrice,
      finalPrice,
      multiplier: urgencyMultiplier,
      appliedRules: [],
      demandFactor: 1.0,
      urgencyMultiplier,
      breakdown: {
        base: basePrice,
        demandAdjustment: 0,
        urgencyAdjustment: basePrice * (urgencyMultiplier - 1),
        timeOfDayAdjustment: 0,
        loyaltyDiscount: 0,
        total: finalPrice,
      },
    };
  }

  private async recordQuoteHistory(
    input: PriceCalculationInput,
    basePrice: number,
    finalPrice: number,
    appliedRules: AppliedRule[],
    demandFactor: number
  ) {
    await this.prisma.priceQuoteHistory.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        serviceId: input.serviceId,
        basePrice,
        finalPrice,
        appliedRules: appliedRules.map(r => ({
          ruleId: r.ruleId,
          multiplier: r.multiplier,
          adjustment: r.adjustment,
        })),
        urgencyLevel: input.urgency,
        demandFactor,
        requestedAt: new Date(),
        scheduledFor: input.scheduledAt,
      },
    });
  }

  private async updateRuleStats(ruleIds: string[], additionalRevenue: number) {
    if (ruleIds.length === 0) return;

    const revenuePerRule = additionalRevenue / ruleIds.length;

    for (const ruleId of ruleIds) {
      await this.prisma.pricingRule.update({
        where: { id: ruleId },
        data: {
          appliedCount: { increment: 1 },
          totalRevenue: { increment: revenuePerRule },
        },
      });
    }
  }

  /**
   * Aggregate demand metrics daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async aggregateDailyMetrics() {
    this.logger.log('Aggregating daily demand metrics');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const tenants = await this.prisma.withSystemContext(() =>
      this.prisma.tenant.findMany({ select: { id: true } }),
    );

    for (const tenant of tenants) {
      await this.prisma.withTenantContext(tenant.id, () =>
        this.aggregateMetricsForTenant(tenant.id, yesterday),
      );
    }
  }

  private async aggregateMetricsForTenant(tenantId: string, date: Date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get appointments for the day
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: date, lt: nextDay },
      },
      select: {
        scheduledAt: true,
        status: true,
        duration: true,
      },
    });

    // Group by hour
    const hourlyData: Record<number, {
      bookings: number;
      completed: number;
      cancelled: number;
      totalDuration: number;
    }> = {};

    for (let h = 0; h < 24; h++) {
      hourlyData[h] = { bookings: 0, completed: 0, cancelled: 0, totalDuration: 0 };
    }

    for (const apt of appointments) {
      const hour = apt.scheduledAt.getHours();
      hourlyData[hour].bookings++;
      if (apt.status === 'COMPLETED') {
        hourlyData[hour].completed++;
        hourlyData[hour].totalDuration += apt.duration;
      } else if (apt.status === 'CANCELLED') {
        hourlyData[hour].cancelled++;
      }
    }

    // Calculate capacity (assume 8 slots per hour per technician)
    const techCount = await this.prisma.user.count({
      where: { tenantId, role: 'TECHNICIAN', status: 'ACTIVE' },
    });
    const slotsPerHour = Math.max(1, techCount) * 2; // 2 appointments per tech per hour

    // Upsert hourly metrics
    for (let hour = 0; hour < 24; hour++) {
      const data = hourlyData[hour];
      const capacityUsed = data.bookings / slotsPerHour;

      await this.prisma.demandMetrics.upsert({
        where: {
          tenantId_date_hour: { tenantId, date, hour },
        },
        create: {
          tenantId,
          date,
          hour,
          dayOfWeek: date.getDay(),
          bookingCount: data.bookings,
          completedJobs: data.completed,
          cancelledJobs: data.cancelled,
          capacityUsed: Math.min(1, capacityUsed),
          avgJobDuration: data.completed > 0
            ? Math.round(data.totalDuration / data.completed)
            : null,
          peakHour: capacityUsed >= 0.8,
        },
        update: {
          bookingCount: data.bookings,
          completedJobs: data.completed,
          cancelledJobs: data.cancelled,
          capacityUsed: Math.min(1, capacityUsed),
          avgJobDuration: data.completed > 0
            ? Math.round(data.totalDuration / data.completed)
            : null,
          peakHour: capacityUsed >= 0.8,
        },
      });
    }
  }
}
