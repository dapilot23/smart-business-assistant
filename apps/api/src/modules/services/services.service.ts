import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../config/cache/cache.service';
import {
  CreateServiceAvailabilityDto,
  UpdateServiceAvailabilityDto,
  UpdateServiceSettingsDto,
} from './dto/service-availability.dto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(tenantId: string) {
    const cacheKey = CACHE_KEYS.SERVICES(tenantId);
    return this.cacheService.wrap(
      cacheKey,
      () =>
        this.prisma.service.findMany({
          where: { tenantId },
          include: { availability: true },
          orderBy: { name: 'asc' },
        }),
      CACHE_TTL.MEDIUM,
    );
  }

  async findOne(tenantId: string, id: string) {
    const cacheKey = CACHE_KEYS.SERVICE(tenantId, id);
    const service = await this.cacheService.wrap(
      cacheKey,
      () =>
        this.prisma.service.findFirst({
          where: { id, tenantId },
          include: { availability: true },
        }),
      CACHE_TTL.MEDIUM,
    );
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async create(tenantId: string, data: {
    name: string;
    description?: string;
    durationMinutes?: number;
    price?: number;
  }) {
    const service = await this.prisma.service.create({
      data: { ...data, tenantId },
      include: { availability: true },
    });
    await this.invalidateServicesCache(tenantId);
    return service;
  }

  private async invalidateServicesCache(tenantId: string) {
    await this.cacheService.del(CACHE_KEYS.SERVICES(tenantId));
  }

  private async invalidateServiceCache(tenantId: string, serviceId: string) {
    await Promise.all([
      this.cacheService.del(CACHE_KEYS.SERVICES(tenantId)),
      this.cacheService.del(CACHE_KEYS.SERVICE(tenantId, serviceId)),
    ]);
  }

  async update(tenantId: string, id: string, data: Partial<{
    name: string;
    description: string;
    durationMinutes: number;
    price: number;
  }>) {
    await this.findOne(tenantId, id);
    const service = await this.prisma.service.update({
      where: { id },
      data,
      include: { availability: true },
    });
    await this.invalidateServiceCache(tenantId, id);
    return service;
  }

  async updateSettings(
    tenantId: string,
    serviceId: string,
    dto: UpdateServiceSettingsDto,
  ) {
    await this.findOne(tenantId, serviceId);
    return this.prisma.service.update({
      where: { id: serviceId },
      data: dto,
      include: { availability: true },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.service.delete({ where: { id } });
    await this.invalidateServiceCache(tenantId, id);
    return { success: true };
  }

  // Service Availability Management
  async getAvailability(tenantId: string, serviceId: string) {
    await this.findOne(tenantId, serviceId);
    return this.prisma.serviceAvailability.findMany({
      where: { serviceId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setAvailability(
    tenantId: string,
    serviceId: string,
    dto: CreateServiceAvailabilityDto,
  ) {
    await this.findOne(tenantId, serviceId);
    return this.prisma.serviceAvailability.upsert({
      where: {
        serviceId_dayOfWeek: { serviceId, dayOfWeek: dto.dayOfWeek },
      },
      update: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive ?? true,
      },
      create: {
        serviceId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateAvailability(
    tenantId: string,
    serviceId: string,
    dayOfWeek: number,
    dto: UpdateServiceAvailabilityDto,
  ) {
    await this.findOne(tenantId, serviceId);
    return this.prisma.serviceAvailability.update({
      where: {
        serviceId_dayOfWeek: { serviceId, dayOfWeek },
      },
      data: dto,
    });
  }

  async deleteAvailability(
    tenantId: string,
    serviceId: string,
    dayOfWeek: number,
  ) {
    await this.findOne(tenantId, serviceId);
    await this.prisma.serviceAvailability.delete({
      where: {
        serviceId_dayOfWeek: { serviceId, dayOfWeek },
      },
    });
    return { success: true };
  }

  async setBulkAvailability(
    tenantId: string,
    serviceId: string,
    availabilities: CreateServiceAvailabilityDto[],
  ) {
    await this.findOne(tenantId, serviceId);

    // Delete existing and create new in a transaction
    await this.prisma.$transaction([
      this.prisma.serviceAvailability.deleteMany({ where: { serviceId } }),
      this.prisma.serviceAvailability.createMany({
        data: availabilities.map((a) => ({
          serviceId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isActive: a.isActive ?? true,
        })),
      }),
    ]);

    return this.getAvailability(tenantId, serviceId);
  }
}
