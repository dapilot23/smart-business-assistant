import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

type PDFDocumentType = InstanceType<typeof PDFDocument>;

interface InvoiceData {
  invoiceNumber: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  status: string;
  createdAt: Date;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

@Injectable()
export class InvoicePdfService {
  async generateInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      this.generateHeader(doc, invoice);
      this.generateCustomerInformation(doc, invoice);
      this.generateInvoiceTable(doc, invoice);
      this.generateFooter(doc);

      doc.end();
    });
  }

  private generateHeader(doc: PDFDocumentType, invoice: InvoiceData) {
    doc
      .fillColor('#333333')
      .fontSize(24)
      .text('INVOICE', 50, 50)
      .fontSize(10)
      .text(`Invoice #: ${invoice.invoiceNumber}`, 200, 50, { align: 'right' })
      .text(`Date: ${this.formatDate(invoice.createdAt)}`, 200, 65, { align: 'right' })
      .text(`Due Date: ${this.formatDate(invoice.dueDate)}`, 200, 80, { align: 'right' })
      .text(`Status: ${invoice.status}`, 200, 95, { align: 'right' })
      .moveDown();
  }

  private generateCustomerInformation(doc: PDFDocumentType, invoice: InvoiceData) {
    doc.fillColor('#333333').fontSize(14).text('Bill To:', 50, 140);

    this.generateHr(doc, 155);

    const customerTop = 165;

    doc
      .fontSize(10)
      .text(invoice.customer.name, 50, customerTop)
      .text(invoice.customer.phone, 50, customerTop + 15)
      .text(invoice.customer.email || '', 50, customerTop + 30)
      .text(invoice.customer.address || '', 50, customerTop + 45)
      .moveDown();

    this.generateHr(doc, 225);
  }

  private generateInvoiceTable(doc: PDFDocumentType, invoice: InvoiceData) {
    const invoiceTableTop = 250;

    doc.font('Helvetica-Bold');
    this.generateTableRow(
      doc,
      invoiceTableTop,
      'Description',
      'Qty',
      'Unit Price',
      'Total',
    );
    this.generateHr(doc, invoiceTableTop + 20);
    doc.font('Helvetica');

    let position = invoiceTableTop + 30;
    for (const item of invoice.items) {
      this.generateTableRow(
        doc,
        position,
        item.description,
        item.quantity.toString(),
        this.formatCurrency(item.unitPrice),
        this.formatCurrency(item.total),
      );
      this.generateHr(doc, position + 20);
      position += 30;
    }

    const subtotalPosition = position + 20;
    this.generateHr(doc, subtotalPosition - 10);

    doc.font('Helvetica-Bold');
    this.generateTableRow(
      doc,
      subtotalPosition,
      '',
      '',
      'Subtotal',
      this.formatCurrency(invoice.amount),
    );

    if (invoice.paidAmount > 0) {
      this.generateTableRow(
        doc,
        subtotalPosition + 25,
        '',
        '',
        'Paid',
        `-${this.formatCurrency(invoice.paidAmount)}`,
      );

      const balanceDue = invoice.amount - invoice.paidAmount;
      this.generateTableRow(
        doc,
        subtotalPosition + 50,
        '',
        '',
        'Balance Due',
        this.formatCurrency(balanceDue),
      );
    } else {
      this.generateTableRow(
        doc,
        subtotalPosition + 25,
        '',
        '',
        'Amount Due',
        this.formatCurrency(invoice.amount),
      );
    }
  }

  private generateFooter(doc: PDFDocumentType) {
    doc
      .fontSize(10)
      .fillColor('#666666')
      .text(
        'Payment is due within 30 days. Thank you for your business!',
        50,
        700,
        { align: 'center', width: 500 },
      );
  }

  private generateTableRow(
    doc: PDFDocumentType,
    y: number,
    description: string,
    quantity: string,
    unitPrice: string,
    total: string,
  ) {
    doc
      .fontSize(10)
      .text(description, 50, y, { width: 250 })
      .text(quantity, 300, y, { width: 50, align: 'right' })
      .text(unitPrice, 370, y, { width: 80, align: 'right' })
      .text(total, 470, y, { width: 80, align: 'right' });
  }

  private generateHr(doc: PDFDocumentType, y: number) {
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
