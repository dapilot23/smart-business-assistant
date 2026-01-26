import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ChannelType } from '@prisma/client';

export interface CreateQuickReplyDto {
  title: string;
  content: string;
  category?: string;
  shortcut?: string;
  channels?: ChannelType[];
}

@Injectable()
export class QuickReplyService {
  private readonly logger = new Logger(QuickReplyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateQuickReplyDto) {
    const quickReply = await this.prisma.quickReply.create({
      data: {
        tenantId,
        title: dto.title,
        content: dto.content,
        category: dto.category,
        shortcut: dto.shortcut,
        channels: dto.channels || [],
        createdBy: userId,
      },
    });

    this.logger.log(`Created quick reply ${quickReply.id}: ${quickReply.title}`);
    return quickReply;
  }

  async list(tenantId: string, options?: {
    category?: string;
    channel?: ChannelType;
    activeOnly?: boolean;
  }) {
    const where: Record<string, unknown> = { tenantId };

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.activeOnly !== false) {
      where.isActive = true;
    }
    if (options?.channel) {
      where.channels = { has: options.channel };
    }

    return this.prisma.quickReply.findMany({
      where,
      orderBy: [{ category: 'asc' }, { usageCount: 'desc' }],
    });
  }

  async getById(tenantId: string, id: string) {
    const quickReply = await this.prisma.quickReply.findFirst({
      where: { id, tenantId },
    });

    if (!quickReply) {
      throw new NotFoundException(`Quick reply ${id} not found`);
    }

    return quickReply;
  }

  async getByShortcut(tenantId: string, shortcut: string) {
    return this.prisma.quickReply.findFirst({
      where: { tenantId, shortcut, isActive: true },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateQuickReplyDto>) {
    await this.getById(tenantId, id);

    return this.prisma.quickReply.update({
      where: { id },
      data: dto,
    });
  }

  async delete(tenantId: string, id: string) {
    await this.getById(tenantId, id);

    await this.prisma.quickReply.delete({ where: { id } });
    this.logger.log(`Deleted quick reply ${id}`);
  }

  async toggleActive(tenantId: string, id: string, isActive: boolean) {
    await this.getById(tenantId, id);

    return this.prisma.quickReply.update({
      where: { id },
      data: { isActive },
    });
  }

  async recordUsage(tenantId: string, id: string) {
    await this.prisma.quickReply.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  async getCategories(tenantId: string) {
    const results = await this.prisma.quickReply.groupBy({
      by: ['category'],
      where: { tenantId, isActive: true },
      _count: { category: true },
    });

    return results
      .filter(r => r.category)
      .map(r => ({
        category: r.category,
        count: r._count.category,
      }));
  }

  async search(tenantId: string, query: string) {
    return this.prisma.quickReply.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { shortcut: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }
}
