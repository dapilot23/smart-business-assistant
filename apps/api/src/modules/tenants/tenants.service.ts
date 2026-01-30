import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, data: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async create(data: CreateTenantDto) {
    return this.prisma.tenant.create({
      data,
    });
  }

  async createTenantWithOwner(data: {
    tenantName: string;
    tenantSlug: string;
    tenantEmail: string;
    tenantPhone?: string;
    ownerName: string;
    ownerEmail: string;
    ownerClerkId: string;
  }) {
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: data.tenantSlug },
          { email: data.tenantEmail },
        ],
      },
    });

    if (existingTenant) {
      throw new BadRequestException('Tenant with this slug or email already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.tenantName,
          slug: data.tenantSlug,
          email: data.tenantEmail,
          phone: data.tenantPhone,
        },
      });

      const owner = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.ownerEmail,
          clerkId: data.ownerClerkId,
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
          tenantId: tenant.id,
          joinedAt: new Date(),
        },
      });

      const settings = await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          businessHours: this.getDefaultBusinessHours(),
        },
      });

      return {
        tenant,
        owner,
        settings,
      };
    });
  }

  async completeOnboarding(tenantId: string, step: string, data: any) {
    const tenant = await this.findById(tenantId);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  private getDefaultBusinessHours() {
    return {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: { start: '09:00', end: '13:00' },
      sunday: { start: '', end: '' },
    };
  }
}
