import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { QuoteStatus } from '@prisma/client';

interface CreateQuoteDto {
  customerId: string;
  description: string;
  amount: number;
  validUntil: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  notes?: string;
}

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.quote.findMany({
      where: { tenantId },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return quote;
  }

  async create(data: CreateQuoteDto, tenantId: string) {
    // Validate customer belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // Generate quote number
    const quoteNumber = await this.generateQuoteNumber(tenantId);

    // Calculate total from items
    const calculatedTotal = data.items.reduce((sum, item) => sum + item.total, 0);

    // Create quote with items
    return this.prisma.quote.create({
      data: {
        quoteNumber,
        description: data.description,
        amount: calculatedTotal,
        validUntil: new Date(data.validUntil),
        status: QuoteStatus.DRAFT,
        tenantId,
        customerId: data.customerId,
        items: {
          create: data.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
      include: { customer: true, items: true },
    });
  }

  async update(id: string, data: Partial<CreateQuoteDto>, tenantId: string) {
    await this.findOne(id, tenantId);

    // If items are provided, delete existing and create new
    if (data.items) {
      await this.prisma.quoteItem.deleteMany({
        where: { quoteId: id },
      });
    }

    const calculatedTotal = data.items
      ? data.items.reduce((sum, item) => sum + item.total, 0)
      : undefined;

    return this.prisma.quote.update({
      where: { id },
      data: {
        ...(data.description && { description: data.description }),
        ...(calculatedTotal !== undefined && { amount: calculatedTotal }),
        ...(data.validUntil && { validUntil: new Date(data.validUntil) }),
        ...(data.items && {
          items: {
            create: data.items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        }),
      },
      include: { customer: true, items: true },
    });
  }

  async updateStatus(id: string, status: QuoteStatus, tenantId: string) {
    await this.findOne(id, tenantId);

    const updateData: any = { status };

    // Set timestamps based on status
    if (status === QuoteStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === QuoteStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }

    return this.prisma.quote.update({
      where: { id },
      data: updateData,
      include: { customer: true, items: true },
    });
  }

  async delete(id: string, tenantId: string) {
    const quote = await this.findOne(id, tenantId);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft quotes');
    }

    return this.prisma.quote.delete({
      where: { id },
    });
  }

  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `Q${year}-`;

    // Find the highest quote number for this tenant this year
    const lastQuote = await this.prisma.quote.findFirst({
      where: {
        tenantId,
        quoteNumber: { startsWith: prefix },
      },
      orderBy: { quoteNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastQuote) {
      const lastNumber = parseInt(lastQuote.quoteNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }
}
