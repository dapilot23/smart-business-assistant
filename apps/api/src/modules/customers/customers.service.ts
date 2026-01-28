import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        appointments: true,
        quotes: true,
        invoices: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async create(data: any, tenantId: string) {
    // TODO: Add proper DTO validation
    return this.prisma.customer.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async update(id: string, data: any, tenantId: string) {
    const customer = await this.findOne(id, tenantId);
    return this.prisma.customer.update({
      where: { id: customer.id },
      data,
    });
  }

  async remove(id: string, tenantId: string) {
    const customer = await this.findOne(id, tenantId);
    return this.prisma.customer.delete({
      where: { id: customer.id },
    });
  }
}
