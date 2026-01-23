import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

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

  async update(id: string, data: any) {
    // TODO: Add proper DTO validation
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async create(data: any) {
    // TODO: Add proper DTO validation
    return this.prisma.tenant.create({
      data,
    });
  }
}
