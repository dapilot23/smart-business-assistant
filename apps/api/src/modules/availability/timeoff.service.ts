import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AvailabilityValidatorsService } from './availability-validators.service';
import { CreateTimeOffDto, UpdateTimeOffDto } from './dto';

@Injectable()
export class TimeOffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validators: AvailabilityValidatorsService,
  ) {}

  async findAll(tenantId: string, userId?: string) {
    const where: any = { tenantId };
    if (userId) {
      where.userId = userId;
    }

    return this.prisma.timeOff.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const timeOff = await this.prisma.timeOff.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!timeOff) {
      throw new NotFoundException('Time off not found');
    }

    if (timeOff.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return timeOff;
  }

  async create(tenantId: string, dto: CreateTimeOffDto) {
    await this.validators.validateUser(tenantId, dto.userId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    this.validators.validateDateRange(startDate, endDate);

    return this.prisma.timeOff.create({
      data: {
        tenantId,
        userId: dto.userId,
        startDate,
        endDate,
        reason: dto.reason,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateTimeOffDto) {
    const existing = await this.findById(tenantId, id);

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;

    this.validators.validateDateRange(startDate, endDate);

    return this.prisma.timeOff.update({
      where: { id },
      data: {
        startDate: dto.startDate ? startDate : undefined,
        endDate: dto.endDate ? endDate : undefined,
        reason: dto.reason,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.timeOff.delete({ where: { id } });
  }
}
