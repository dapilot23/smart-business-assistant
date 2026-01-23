import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

type PDFDocumentType = InstanceType<typeof PDFDocument>;

interface QuoteData {
  quoteNumber: string;
  description: string;
  amount: number;
  validUntil: Date;
  status: string;
  createdAt: Date;
  customer: {
    name: string;
    email: string | null;
    phone: string;
    address?: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  tenant?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

@Injectable()
export class PdfService {
  async generateQuotePdf(quote: QuoteData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('QUOTE', 50, 50)
        .fontSize(12)
        .font('Helvetica')
        .text(quote.quoteNumber, 50, 80);

      // Business Info (right side)
      doc
        .fontSize(10)
        .text(quote.tenant?.name || 'Smart Business Assistant', 400, 50, { align: 'right' })
        .text(quote.tenant?.email || '', 400, 65, { align: 'right' })
        .text(quote.tenant?.phone || '', 400, 80, { align: 'right' });

      // Quote Details
      doc
        .fontSize(10)
        .text(`Date: ${this.formatDate(quote.createdAt)}`, 50, 120)
        .text(`Valid Until: ${this.formatDate(quote.validUntil)}`, 50, 135)
        .text(`Status: ${quote.status}`, 50, 150);

      // Customer Info
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, 180)
        .fontSize(10)
        .font('Helvetica')
        .text(quote.customer.name, 50, 200)
        .text(quote.customer.email || '', 50, 215)
        .text(quote.customer.phone, 50, 230);

      if (quote.customer.address) {
        doc.text(quote.customer.address, 50, 245);
      }

      // Line Items Table
      const tableTop = 290;
      this.generateTableHeader(doc, tableTop);
      this.generateTableRows(doc, quote.items, tableTop + 25);

      // Total
      const totalY = tableTop + 25 + (quote.items.length * 25) + 20;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Total:', 400, totalY)
        .text(this.formatCurrency(quote.amount), 480, totalY, { align: 'right' });

      // Footer
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(
          'Thank you for your business. This quote is valid for the period specified above.',
          50,
          doc.page.height - 100,
          { align: 'center', width: doc.page.width - 100 }
        );

      doc.end();
    });
  }

  private generateTableHeader(doc: PDFDocumentType, y: number) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333');

    // Draw header background
    doc
      .rect(50, y - 5, 510, 20)
      .fill('#f0f0f0');

    doc
      .fillColor('#333333')
      .text('Description', 55, y)
      .text('Qty', 350, y)
      .text('Unit Price', 400, y)
      .text('Total', 480, y, { align: 'right' });

    // Draw line under header
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(50, y + 15)
      .lineTo(560, y + 15)
      .stroke();
  }

  private generateTableRows(doc: PDFDocumentType, items: QuoteData['items'], startY: number) {
    doc.font('Helvetica').fontSize(10).fillColor('#333333');

    items.forEach((item, index) => {
      const y = startY + (index * 25);

      doc
        .text(item.description, 55, y, { width: 280 })
        .text(item.quantity.toString(), 350, y)
        .text(this.formatCurrency(item.unitPrice), 400, y)
        .text(this.formatCurrency(item.total), 480, y, { align: 'right' });

      // Draw line under each row
      doc
        .strokeColor('#eeeeee')
        .lineWidth(0.5)
        .moveTo(50, y + 15)
        .lineTo(560, y + 15)
        .stroke();
    });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}
