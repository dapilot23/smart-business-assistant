import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AvailabilityValidatorsService } from './availability-validators.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validators: AvailabilityValidatorsService,
  ) {}

  async findAll(tenantId: string, userId?: string) {
    const where: any = { tenantId };
    if (userId) {
      where.userId = userId;
    }

    return this.prisma.technicianAvailability.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ userId: 'asc' }, { dayOfWeek: 'asc' }],
    });
  }

  async findById(tenantId: string, id: string) {
    const availability = await this.prisma.technicianAvailability.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return availability;
  }

  async create(tenantId: string, dto: CreateAvailabilityDto) {
    await this.validators.validateUser(tenantId, dto.userId);
    this.validators.validateTimeRange(dto.startTime, dto.endTime);

    const existing = await this.prisma.technicianAvailability.findUnique({
      where: {
        tenantId_userId_dayOfWeek: {
          tenantId,
          userId: dto.userId,
          dayOfWeek: dto.dayOfWeek,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Availability already exists for this day. Use update instead.',
      );
    }

    return this.prisma.technicianAvailability.create({
      data: {
        tenantId,
        userId: dto.userId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive ?? true,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateAvailabilityDto) {
    await this.findById(tenantId, id);

    if (dto.startTime && dto.endTime) {
      this.validators.validateTimeRange(dto.startTime, dto.endTime);
    }

    return this.prisma.technicianAvailability.update({
      where: { id },
      data: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.technicianAvailability.delete({ where: { id } });
  }
}
