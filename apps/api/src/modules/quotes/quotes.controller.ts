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
import { QuotesService } from './quotes.service';
import { PdfService } from './pdf.service';
import { SmsService } from '../sms/sms.service';

@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly pdfService: PdfService,
    private readonly smsService: SmsService,
  ) {}

  @Get()
  async findAll(@Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.quotesService.findAll(tenantId);
  }

  @Get('pipeline/stats')
  async getPipelineStats(@Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.quotesService.getPipelineStats(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.quotesService.findOne(id, tenantId);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async generatePdf(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    const quote = await this.quotesService.findOne(id, tenantId);

    const pdfBuffer = await this.pdfService.generateQuotePdf({
      quoteNumber: quote.quoteNumber,
      description: quote.description,
      amount: quote.amount,
      validUntil: quote.validUntil,
      status: quote.status,
      createdAt: quote.createdAt,
      customer: {
        name: quote.customer.name,
        email: quote.customer.email,
        phone: quote.customer.phone,
        address: quote.customer.address || undefined,
      },
      items: quote.items,
    });

    res.setHeader('Content-Disposition', `attachment; filename="${quote.quoteNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }

  @Post()
  async create(@Body() createData: any, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.quotesService.create(createData, tenantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    return this.quotesService.update(id, updateData, tenantId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusData: any,
    @Request() req,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    return this.quotesService.updateStatus(id, statusData.status, tenantId);
  }

  @Post(':id/send')
  async sendQuote(
    @Param('id') id: string,
    @Body() sendOptions: { method?: 'sms' | 'email' | 'both' },
    @Request() req,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    const quote = await this.quotesService.findOne(id, tenantId);

    const results: { sms?: any; email?: any } = {};
    const method = sendOptions.method || 'sms';

    if (method === 'sms' || method === 'both') {
      try {
        results.sms = await this.smsService.sendQuote(
          quote.customer.phone,
          quote.customer.name,
          quote.quoteNumber,
          quote.amount,
          quote.validUntil,
        );
      } catch (error) {
        results.sms = { success: false, error: error.message };
      }
    }

    const updatedQuote = await this.quotesService.sendQuote(id, tenantId);

    return {
      quote: updatedQuote,
      delivery: results,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    const tenantId = req.user?.tenantId || 'default';
    return this.quotesService.delete(id, tenantId);
  }
}
