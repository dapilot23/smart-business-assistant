import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    let settings = await this.prisma.referralSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      settings = await this.prisma.referralSettings.create({
        data: { tenantId },
      });
    }

    return settings;
  }

  async updateSettings(
    tenantId: string,
    data: {
      isEnabled?: boolean;
      referrerRewardType?: string;
      referrerRewardValue?: number;
      referredRewardType?: string;
      referredRewardValue?: number;
      maxReferralsPerCustomer?: number | null;
      referralExpiryDays?: number;
      minPurchaseForReward?: number | null;
    },
  ) {
    return this.prisma.referralSettings.upsert({
      where: { tenantId },
      update: data as any,
      create: { tenantId, ...data } as any,
    });
  }

  async generateCode(tenantId: string, customerId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.isEnabled) {
      throw new BadRequestException('Referral program is not enabled');
    }

    // Check max referrals limit
    if (settings.maxReferralsPerCustomer) {
      const existingCount = await this.prisma.referral.count({
        where: { tenantId, referrerId: customerId },
      });

      if (existingCount >= settings.maxReferralsPerCustomer) {
        throw new BadRequestException('Maximum referrals limit reached');
      }
    }

    // Check for existing active referral code
    const existing = await this.prisma.referral.findFirst({
      where: {
        tenantId,
        referrerId: customerId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return existing;
    }

    // Generate unique code
    const code = this.generateUniqueCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.referralExpiryDays);

    return this.prisma.referral.create({
      data: {
        tenantId,
        referrerId: customerId,
        referralCode: code,
        referrerReward: this.formatReward(settings.referrerRewardType, Number(settings.referrerRewardValue)),
        referredReward: this.formatReward(settings.referredRewardType, Number(settings.referredRewardValue)),
        referrerRewardValue: settings.referrerRewardValue,
        referredRewardValue: settings.referredRewardValue,
        expiresAt,
      },
    });
  }

  async findByCode(code: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { referralCode: code },
      include: {
        referrer: { select: { id: true, name: true } },
      },
    });

    if (!referral) {
      throw new NotFoundException('Invalid referral code');
    }

    if (referral.status !== 'PENDING') {
      throw new BadRequestException('Referral code has already been used');
    }

    if (referral.expiresAt && referral.expiresAt < new Date()) {
      throw new BadRequestException('Referral code has expired');
    }

    return referral;
  }

  async convertReferral(
    code: string,
    referredCustomerId: string,
    referredEmail?: string,
    referredPhone?: string,
  ) {
    const referral = await this.findByCode(code);

    if (referral.referrerId === referredCustomerId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    return this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredId: referredCustomerId,
        referredEmail,
        referredPhone,
        status: 'CONVERTED',
        convertedAt: new Date(),
      },
    });
  }

  async markRewarded(tenantId: string, referralId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { id: referralId, tenantId },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    if (referral.status !== 'CONVERTED') {
      throw new BadRequestException('Referral must be converted before rewarding');
    }

    return this.prisma.referral.update({
      where: { id: referralId },
      data: {
        status: 'REWARDED',
        rewardedAt: new Date(),
      },
    });
  }

  async findAll(tenantId: string, filters?: { status?: string; referrerId?: string }) {
    return this.prisma.referral.findMany({
      where: {
        tenantId,
        status: filters?.status,
        referrerId: filters?.referrerId,
      },
      include: {
        referrer: { select: { id: true, name: true, phone: true } },
        referred: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(tenantId: string) {
    const [total, converted, rewarded, revenue] = await Promise.all([
      this.prisma.referral.count({ where: { tenantId } }),
      this.prisma.referral.count({ where: { tenantId, status: 'CONVERTED' } }),
      this.prisma.referral.count({ where: { tenantId, status: 'REWARDED' } }),
      this.prisma.referral.aggregate({
        where: { tenantId, status: { in: ['CONVERTED', 'REWARDED'] } },
        _sum: { referrerRewardValue: true, referredRewardValue: true },
      }),
    ]);

    return {
      totalReferrals: total,
      converted,
      rewarded,
      pendingRewards: converted - rewarded,
      totalRewardsValue:
        Number(revenue._sum.referrerRewardValue ?? 0) +
        Number(revenue._sum.referredRewardValue ?? 0),
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    };
  }

  async getTopReferrers(tenantId: string, limit = 10) {
    const referrers = await this.prisma.referral.groupBy({
      by: ['referrerId'],
      where: { tenantId, status: { in: ['CONVERTED', 'REWARDED'] } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // Get customer details for top referrers
    const customerIds = referrers.map((r) => r.referrerId);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return referrers.map((r) => ({
      customer: customerMap.get(r.referrerId),
      conversions: r._count.id,
    }));
  }

  private generateUniqueCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private formatReward(type: string, value: number): string {
    switch (type) {
      case 'CREDIT':
        return `$${value} credit`;
      case 'DISCOUNT_PERCENT':
        return `${value}% off`;
      case 'DISCOUNT_FLAT':
        return `$${value} off`;
      default:
        return `$${value}`;
    }
  }
}
