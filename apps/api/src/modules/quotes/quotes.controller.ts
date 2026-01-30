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
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import { PdfService } from './pdf.service';
import { SmsService } from '../sms/sms.service';
import { toNum } from '../../common/utils/decimal';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly pdfService: PdfService,
    private readonly smsService: SmsService,
  ) {}

  private requireTenantId(req: any): string {
    const tenantId = req.user?.tenantId || req.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found');
    }
    return tenantId;
  }

  @Get()
  async findAll(@Request() req) {
    const tenantId = this.requireTenantId(req);
    return this.quotesService.findAll(tenantId);
  }

  @Get('pipeline/stats')
  async getPipelineStats(@Request() req) {
    const tenantId = this.requireTenantId(req);
    return this.quotesService.getPipelineStats(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const tenantId = this.requireTenantId(req);
    return this.quotesService.findOne(id, tenantId);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async generatePdf(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const tenantId = this.requireTenantId(req);
    const quote = await this.quotesService.findOne(id, tenantId);

    const pdfBuffer = await this.pdfService.generateQuotePdf({
      quoteNumber: quote.quoteNumber,
      description: quote.description,
      amount: toNum(quote.amount),
      validUntil: quote.validUntil,
      status: quote.status,
      createdAt: quote.createdAt,
      customer: {
        name: quote.customer.name,
        email: quote.customer.email,
        phone: quote.customer.phone,
        address: quote.customer.address || undefined,
      },
      items: quote.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: toNum(item.unitPrice),
        total: toNum(item.total),
      })),
    });

    res.setHeader('Content-Disposition', `attachment; filename="${quote.quoteNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER)
  async create(@Body() createData: any, @Request() req) {
    const tenantId = this.requireTenantId(req);
    return this.quotesService.create(createData, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER)
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    const tenantId = this.requireTenantId(req);
    return this.quotesService.update(id, updateData, tenantId);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER)
  async updateStatus(
    @Param('id') id: string,
    @Body() statusData: any,
    @Request() req,
  ) {
    const tenantId = this.requireTenantId(req);
    return this.quotesService.updateStatus(id, statusData.status, tenantId);
  }

  @Post(':id/send')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER)
  async sendQuote(
    @Param('id') id: string,
    @Body() sendOptions: { method?: 'sms' | 'email' | 'both' },
    @Request() req,
  ) {
    const tenantId = this.requireTenantId(req);
    const quote = await this.quotesService.findOne(id, tenantId);

    const results: { sms?: any; email?: any } = {};
    const method = sendOptions.method || 'sms';

    if (method === 'sms' || method === 'both') {
      try {
        results.sms = await this.smsService.sendQuote(
          quote.customer.phone,
          quote.customer.name,
          quote.quoteNumber,
          toNum(quote.amount),
          quote.validUntil,
          undefined,
          tenantId,
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
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER)
  async delete(@Param('id') id: string, @Request() req) {
    const tenantId = this.requireTenantId(req);
    return this.quotesService.delete(id, tenantId);
  }
}
