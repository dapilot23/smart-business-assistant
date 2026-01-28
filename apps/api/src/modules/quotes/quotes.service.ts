import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, QuoteEventPayload } from '../../config/events/events.types';
import { QuoteFollowupService } from './quote-followup.service';
import { QuoteStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { toNum } from '../../common/utils/decimal';

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
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly followupService: QuoteFollowupService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.quote.findMany({
      where: { tenantId },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, tenantId },
      include: { customer: true, items: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async create(data: CreateQuoteDto, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Validate customer belongs to tenant
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, tenantId },
      });

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }

      // Generate quote number
      const quoteNumber = await this.generateQuoteNumber(tenantId, tx);

      // Calculate total from items
      const calculatedTotal = data.items.reduce((sum, item) => sum + item.total, 0);

      // Create quote with items
      return tx.quote.create({
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
    });
  }

  async update(id: string, data: Partial<CreateQuoteDto>, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: { id, tenantId },
      });

      if (!quote) {
        throw new NotFoundException('Quote not found');
      }

      // If items are provided, delete existing and create new
      if (data.items) {
        await tx.quoteItem.deleteMany({
          where: { quoteId: id },
        });
      }

      const calculatedTotal = data.items
        ? data.items.reduce((sum, item) => sum + item.total, 0)
        : undefined;

      return tx.quote.update({
        where: { id: quote.id },
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
    });
  }

  async updateStatus(id: string, status: QuoteStatus, tenantId: string) {
    const existing = await this.findOne(id, tenantId);

    const updateData: any = { status };

    if (status === QuoteStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === QuoteStatus.ACCEPTED) {
      updateData.convertedAt = new Date();
    }

    const quote = await this.prisma.quote.update({
      where: { id: existing.id },
      data: updateData,
      include: { customer: true, items: true },
    });

    if (status === QuoteStatus.ACCEPTED) {
      this.eventsService.emit<QuoteEventPayload>(
        EVENTS.QUOTE_ACCEPTED,
        this.buildQuotePayload(tenantId, quote),
      );
      await this.followupService.cancelFollowUps(id);
    } else if (status === QuoteStatus.REJECTED) {
      this.eventsService.emit<QuoteEventPayload>(
        EVENTS.QUOTE_REJECTED,
        this.buildQuotePayload(tenantId, quote),
      );
      await this.followupService.cancelFollowUps(id);
    }

    return quote;
  }

  async sendQuote(id: string, tenantId: string) {
    const quote = await this.findOne(id, tenantId);

    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status: QuoteStatus.SENT, sentAt: new Date() },
      include: { customer: true, items: true },
    });

    this.eventsService.emit<QuoteEventPayload>(
      EVENTS.QUOTE_SENT,
      this.buildQuotePayload(tenantId, updated),
    );

    await this.followupService.scheduleFollowUps(tenantId, id);

    return updated;
  }

  async delete(id: string, tenantId: string) {
    const quote = await this.findOne(id, tenantId);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft quotes');
    }

    return this.prisma.quote.delete({
      where: { id: quote.id },
    });
  }

  async getPipelineStats(tenantId: string) {
    const quotes = await this.prisma.quote.findMany({
      where: { tenantId },
      select: { status: true, id: true },
    });

    const counts = { DRAFT: 0, SENT: 0, ACCEPTED: 0, REJECTED: 0, EXPIRED: 0 };
    for (const q of quotes) {
      counts[q.status] = (counts[q.status] || 0) + 1;
    }

    const followingUp = await this.prisma.quoteFollowUp.count({
      where: { tenantId, status: 'PENDING' },
    });

    const decided = counts.ACCEPTED + counts.REJECTED + counts.EXPIRED;
    const conversionRate = decided > 0
      ? Math.round((counts.ACCEPTED / decided) * 100) / 100
      : 0;

    return {
      total: quotes.length,
      draft: counts.DRAFT,
      sent: counts.SENT,
      followingUp,
      accepted: counts.ACCEPTED,
      rejected: counts.REJECTED,
      expired: counts.EXPIRED,
      conversionRate,
    };
  }

  private buildQuotePayload(
    tenantId: string,
    quote: {
      id: string;
      quoteNumber: string;
      amount: Decimal | number;
      validUntil: Date;
      customer: { id: string; name: string; phone: string; email: string | null };
    },
  ): Omit<QuoteEventPayload, 'timestamp' | 'correlationId'> {
    return {
      tenantId,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerId: quote.customer.id,
      customerName: quote.customer.name,
      customerPhone: quote.customer.phone,
      customerEmail: quote.customer.email || undefined,
      amount: toNum(quote.amount),
      validUntil: quote.validUntil,
    };
  }

  private async generateQuoteNumber(tenantId: string, tx?: any): Promise<string> {
    const prisma = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `Q${year}-`;

    // Find the highest quote number for this tenant this year
    const lastQuote = await prisma.quote.findFirst({
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
