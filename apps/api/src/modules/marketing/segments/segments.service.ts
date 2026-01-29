import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { SegmentRulesEngine, SegmentRules } from './segment-rules.engine';

@Injectable()
export class SegmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngine: SegmentRulesEngine,
  ) {}

  async create(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      rules: SegmentRules;
      createdBy?: string;
    },
  ) {
    if (!this.rulesEngine.validateRules(data.rules)) {
      throw new BadRequestException('Invalid segment rules');
    }

    const segment = await this.prisma.audienceSegment.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        rules: data.rules as any,
        createdBy: data.createdBy,
      },
    });

    // Calculate initial member count
    const memberCount = await this.calculateMemberCount(tenantId, data.rules);
    await this.prisma.audienceSegment.update({
      where: { id: segment.id },
      data: { memberCount, lastCalculatedAt: new Date() },
    });

    return { ...segment, memberCount };
  }

  async findAll(tenantId: string) {
    return this.prisma.audienceSegment.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const segment = await this.prisma.audienceSegment.findFirst({
      where: { id, tenantId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    return segment;
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      rules?: SegmentRules;
    },
  ) {
    const segment = await this.findOne(tenantId, id);

    if (data.rules && !this.rulesEngine.validateRules(data.rules)) {
      throw new BadRequestException('Invalid segment rules');
    }

    const updated = await this.prisma.audienceSegment.update({
      where: { id: segment.id },
      data: {
        name: data.name,
        description: data.description,
        rules: data.rules as any,
      },
    });

    // Recalculate member count if rules changed
    if (data.rules) {
      const memberCount = await this.calculateMemberCount(tenantId, data.rules);
      await this.prisma.audienceSegment.update({
        where: { id: segment.id },
        data: { memberCount, lastCalculatedAt: new Date() },
      });
      return { ...updated, memberCount };
    }

    return updated;
  }

  async delete(tenantId: string, id: string) {
    const segment = await this.findOne(tenantId, id);

    // Soft delete by marking inactive
    return this.prisma.audienceSegment.update({
      where: { id: segment.id },
      data: { isActive: false },
    });
  }

  async previewMembers(tenantId: string, rules: SegmentRules, limit = 20) {
    if (!this.rulesEngine.validateRules(rules)) {
      throw new BadRequestException('Invalid segment rules');
    }

    const whereClause = this.rulesEngine.buildWhereClause(rules);

    return this.prisma.customer.findMany({
      where: { tenantId, ...whereClause },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        healthScore: true,
        churnRisk: true,
        lifecycleStage: true,
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSegmentMembers(tenantId: string, segmentId: string) {
    const segment = await this.findOne(tenantId, segmentId);
    const rules = segment.rules as unknown as SegmentRules;

    if (!this.rulesEngine.validateRules(rules)) {
      throw new BadRequestException('Invalid segment rules');
    }

    const whereClause = this.rulesEngine.buildWhereClause(rules);

    return this.prisma.customer.findMany({
      where: { tenantId, ...whereClause },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
  }

  async calculateMemberCount(tenantId: string, rules: SegmentRules): Promise<number> {
    const whereClause = this.rulesEngine.buildWhereClause(rules);

    return this.prisma.customer.count({
      where: { tenantId, ...whereClause },
    });
  }

  async refreshAllSegmentCounts(tenantId: string) {
    const segments = await this.prisma.audienceSegment.findMany({
      where: { tenantId, isActive: true },
    });

    for (const segment of segments) {
      const rules = segment.rules as unknown as SegmentRules;
      if (this.rulesEngine.validateRules(rules)) {
        const memberCount = await this.calculateMemberCount(tenantId, rules);
        await this.prisma.audienceSegment.update({
          where: { id: segment.id },
          data: { memberCount, lastCalculatedAt: new Date() },
        });
      }
    }
  }

  getSupportedFields() {
    return this.rulesEngine.getSupportedFields();
  }
}
