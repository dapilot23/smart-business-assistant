import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService, CreateInvoiceDto } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { SmsService } from '../sms/sms.service';
import { InvoiceStatus } from '@prisma/client';
import { toNum } from '../../common/utils/decimal';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: InvoicePdfService,
    private readonly smsService: SmsService,
  ) {}

  @Get()
  async findAll(@Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.invoicesService.findAll(tenantId);
  }

  @Get('stats')
  async getStats(@Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.invoicesService.getStats(tenantId);
  }

  @Get('pipeline-stats')
  async getPipelineStats(@Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.invoicesService.getPipelineStats(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.invoicesService.findOne(id, tenantId);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async generatePdf(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    const invoice = await this.invoicesService.findOne(id, tenantId);

    const pdfBuffer = await this.pdfService.generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      amount: toNum(invoice.amount),
      paidAmount: toNum(invoice.paidAmount),
      dueDate: invoice.dueDate,
      status: invoice.status,
      createdAt: invoice.createdAt,
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email || '',
        phone: invoice.customer.phone,
        address: invoice.customer.address || undefined,
      },
      items: invoice.items.map(item => ({
        ...item,
        unitPrice: toNum(item.unitPrice),
        total: toNum(item.total),
      })),
    });

    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }

  @Post()
  async create(@Body() createData: CreateInvoiceDto, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.invoicesService.create(createData, tenantId);
  }

  @Post('from-quote')
  async createFromQuote(
    @Body() data: { quoteId: string; dueDate: string },
    @Request() req,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    return this.invoicesService.createFromQuote(data.quoteId, tenantId, data.dueDate);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusData: { status: InvoiceStatus },
    @Request() req,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    return this.invoicesService.updateStatus(id, statusData.status, tenantId);
  }

  @Post(':id/send')
  async sendInvoice(
    @Param('id') id: string,
    @Body() sendOptions: { method?: 'sms' | 'email' | 'both' },
    @Request() req,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    const invoice = await this.invoicesService.findOne(id, tenantId);

    const results: { sms?: any; email?: any } = {};
    const method = sendOptions.method || 'sms';

    if (method === 'sms' || method === 'both') {
      try {
        results.sms = await this.smsService.sendInvoice(
          invoice.customer.phone,
          invoice.customer.name,
          invoice.invoiceNumber,
          toNum(invoice.amount) - toNum(invoice.paidAmount),
          invoice.dueDate,
        );
      } catch (error) {
        results.sms = { success: false, error: error.message };
      }
    }

    const updatedInvoice = await this.invoicesService.updateStatus(
      id,
      InvoiceStatus.SENT,
      tenantId,
    );

    return {
      invoice: updatedInvoice,
      delivery: results,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.invoicesService.delete(id, tenantId);
  }
}
