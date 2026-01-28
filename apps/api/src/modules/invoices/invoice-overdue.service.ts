import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, InvoiceEventPayload } from '../../config/events/events.types';
import { toNum } from '../../common/utils/decimal';

@Injectable()
export class InvoiceOverdueService {
  private readonly logger = new Logger(InvoiceOverdueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  @Cron('0 9 * * *')
  async processOverdueInvoices() {
    this.logger.log('Running daily overdue invoice check');

    const markedCount = await this.markOverdueInvoices();
    const feeCount = await this.applyLateFees();

    this.logger.log(
      `Overdue check complete: ${markedCount} marked overdue, ${feeCount} late fees applied`,
    );
  }

  private async markOverdueInvoices(): Promise<number> {
    const now = new Date();

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'SENT',
        dueDate: { lt: now },
      },
      include: { customer: true },
    });

    for (const invoice of overdueInvoices) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      });

      this.eventsService.emit<InvoiceEventPayload>(EVENTS.INVOICE_OVERDUE, {
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customer.name,
        customerPhone: invoice.customer.phone,
        customerEmail: invoice.customer.email || undefined,
        amount: toNum(invoice.amount),
      });
    }

    return overdueInvoices.length;
  }

  private async applyLateFees(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const eligible = await this.prisma.invoice.findMany({
      where: {
        status: 'OVERDUE',
        lateFeeApplied: false,
        dueDate: { lt: sevenDaysAgo },
      },
      include: { tenant: true },
    });

    let applied = 0;

    for (const invoice of eligible) {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId: invoice.tenantId },
      });

      if (!settings?.lateFeeEnabled) continue;

      const feePercentage = settings.lateFeePercentage || 5;
      const outstanding = toNum(invoice.amount) - toNum(invoice.paidAmount);
      const lateFeeAmount = Math.round(outstanding * feePercentage) / 100;

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lateFeeApplied: true,
          lateFeeAmount,
          amount: toNum(invoice.amount) + lateFeeAmount,
        },
      });

      this.logger.log(
        `Applied $${lateFeeAmount.toFixed(2)} late fee to invoice ${invoice.invoiceNumber}`,
      );
      applied++;
    }

    return applied;
  }
}
