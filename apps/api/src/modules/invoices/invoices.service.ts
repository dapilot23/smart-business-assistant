import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';

export interface InvoiceItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CreateInvoiceDto {
  customerId: string;
  description: string;
  dueDate: string;
  items: InvoiceItemDto[];
  quoteId?: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return invoice;
  }

  async create(data: CreateInvoiceDto, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);
    const calculatedTotal = data.items.reduce((sum, item) => sum + item.total, 0);

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        description: data.description,
        amount: calculatedTotal,
        dueDate: new Date(data.dueDate),
        status: InvoiceStatus.DRAFT,
        tenantId,
        customerId: data.customerId,
        quoteId: data.quoteId,
        items: {
          create: data.items.map((item) => ({
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

  async createFromQuote(quoteId: string, tenantId: string, dueDate: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: { customer: true, items: true },
    });

    if (!quote) {
      throw new BadRequestException('Quote not found');
    }

    if (quote.status !== 'ACCEPTED') {
      throw new BadRequestException('Only accepted quotes can be converted to invoices');
    }

    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { quoteId, tenantId },
    });

    if (existingInvoice) {
      throw new BadRequestException('Invoice already exists for this quote');
    }

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        description: quote.description,
        amount: quote.amount,
        dueDate: new Date(dueDate),
        status: InvoiceStatus.DRAFT,
        tenantId,
        customerId: quote.customerId,
        quoteId: quote.id,
        items: {
          create: quote.items.map((item) => ({
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

  async updateStatus(id: string, status: InvoiceStatus, tenantId: string) {
    await this.findOne(id, tenantId);

    const updateData: any = { status };

    if (status === InvoiceStatus.SENT) {
      updateData.sentAt = new Date();
    }

    if (status === InvoiceStatus.PAID) {
      updateData.paidAt = new Date();
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { customer: true, items: true },
    });
  }

  async delete(id: string, tenantId: string) {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid invoice');
    }

    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  async getStats(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
    });

    const total = invoices.length;
    const draft = invoices.filter((i) => i.status === InvoiceStatus.DRAFT).length;
    const sent = invoices.filter((i) => i.status === InvoiceStatus.SENT).length;
    const paid = invoices.filter((i) => i.status === InvoiceStatus.PAID).length;
    const overdue = invoices.filter((i) => i.status === InvoiceStatus.OVERDUE).length;

    const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0);
    const paidAmount = invoices
      .filter((i) => i.status === InvoiceStatus.PAID)
      .reduce((sum, i) => sum + i.amount, 0);
    const outstandingAmount = invoices
      .filter((i) => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE)
      .reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);

    return {
      total,
      draft,
      sent,
      paid,
      overdue,
      totalAmount,
      paidAmount,
      outstandingAmount,
    };
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV${year}-`;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        tenantId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }
}
