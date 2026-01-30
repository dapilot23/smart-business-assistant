import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';
import { PaymentReminderService } from '../payment-reminders/payment-reminder.service';
import { EventsService } from '../../config/events/events.service';
import {
  EVENTS,
  InvoiceEventPayload,
} from '../../config/events/events.types';
import { toNum } from '../../common/utils/decimal';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderService: PaymentReminderService,
    private readonly eventsService: EventsService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        items: true,
        reminders: {
          orderBy: { step: 'asc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async create(data: CreateInvoiceDto, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, tenantId },
      });

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }

      const invoiceNumber = await this.generateInvoiceNumber(tenantId, tx);
      const calculatedTotal = data.items.reduce((sum, item) => sum + item.total, 0);

      return tx.invoice.create({
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
    });
  }

  async createFromQuote(quoteId: string, tenantId: string, dueDate: string) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: { id: quoteId, tenantId },
        include: { customer: true, items: true },
      });

      if (!quote) {
        throw new BadRequestException('Quote not found');
      }

      if (quote.status !== 'ACCEPTED') {
        throw new BadRequestException('Only accepted quotes can be converted to invoices');
      }

      const existingInvoice = await tx.invoice.findFirst({
        where: { quoteId, tenantId },
      });

      if (existingInvoice) {
        throw new BadRequestException('Invoice already exists for this quote');
      }

      const invoiceNumber = await this.generateInvoiceNumber(tenantId, tx);

      return tx.invoice.create({
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
    });
  }

  async updateStatus(id: string, status: InvoiceStatus, tenantId: string) {
    const existing = await this.findOne(id, tenantId);

    const updateData: any = { status };

    if (status === InvoiceStatus.SENT) {
      updateData.sentAt = new Date();
    }

    if (status === InvoiceStatus.PAID) {
      updateData.paidAt = new Date();
    }

    const invoice = await this.prisma.invoice.update({
      where: { id: existing.id },
      data: updateData,
      include: { customer: true, items: true },
    });

    await this.handleStatusSideEffects(invoice, status, tenantId);

    return invoice;
  }

  private async handleStatusSideEffects(
    invoice: any,
    status: InvoiceStatus,
    tenantId: string,
  ) {
    const payload: Omit<InvoiceEventPayload, 'timestamp' | 'correlationId'> = {
      tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      customerPhone: invoice.customer.phone,
      customerEmail: invoice.customer.email,
      amount: invoice.amount,
    };

    if (status === InvoiceStatus.SENT) {
      await this.reminderService.scheduleReminders(invoice.id, tenantId);
      this.eventsService.emit<InvoiceEventPayload>(EVENTS.INVOICE_SENT, payload);
    }

    if (status === InvoiceStatus.PAID || status === InvoiceStatus.CANCELLED) {
      await this.reminderService.cancelReminders(invoice.id);
    }
  }

  async delete(id: string, tenantId: string) {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid invoice');
    }

    return this.prisma.invoice.delete({
      where: { id: invoice.id },
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

    const totalAmount = invoices.reduce((sum, i) => sum + toNum(i.amount), 0);
    const paidAmount = invoices
      .filter((i) => i.status === InvoiceStatus.PAID)
      .reduce((sum, i) => sum + toNum(i.amount), 0);
    const outstandingAmount = invoices
      .filter((i) => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE)
      .reduce((sum, i) => sum + (toNum(i.amount) - toNum(i.paidAmount)), 0);

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

  async getPipelineStats(tenantId: string) {
    const [outstanding, overdue, paidInvoices, lateFees, pendingReminders] =
      await Promise.all([
        this.prisma.invoice.findMany({
          where: { tenantId, status: { in: ['SENT', 'OVERDUE'] } },
        }),
        this.prisma.invoice.findMany({
          where: { tenantId, status: 'OVERDUE' },
        }),
        this.prisma.invoice.findMany({
          where: { tenantId, status: 'PAID', sentAt: { not: null }, paidAt: { not: null } },
        }),
        this.prisma.invoice.aggregate({
          where: { tenantId, lateFeeApplied: true },
          _sum: { lateFeeAmount: true },
        }),
        this.prisma.paymentReminder.count({
          where: { tenantId, status: 'PENDING' },
        }),
      ]);

    const outstandingTotal = outstanding.reduce(
      (sum, i) => sum + (toNum(i.amount) - toNum(i.paidAmount)), 0,
    );
    const overdueTotal = overdue.reduce(
      (sum, i) => sum + (toNum(i.amount) - toNum(i.paidAmount)), 0,
    );

    const avgDaysToPayment = this.calcAvgDaysToPayment(paidInvoices);

    return {
      outstandingCount: outstanding.length,
      outstandingTotal,
      overdueCount: overdue.length,
      overdueTotal,
      avgDaysToPayment,
      lateFeeTotal: lateFees._sum.lateFeeAmount || 0,
      pendingReminders,
    };
  }

  private calcAvgDaysToPayment(
    invoices: { sentAt: Date | null; paidAt: Date | null }[],
  ): number | null {
    const valid = invoices.filter((i) => i.sentAt && i.paidAt);
    if (valid.length === 0) return null;

    const totalDays = valid.reduce((sum, i) => {
      const days = (i.paidAt!.getTime() - i.sentAt!.getTime()) / 86400000;
      return sum + days;
    }, 0);

    return Math.round((totalDays / valid.length) * 10) / 10;
  }

  private async generateInvoiceNumber(tenantId: string, tx?: any): Promise<string> {
    const prisma = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `INV${year}-`;

    const lastInvoice = await prisma.invoice.findFirst({
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
