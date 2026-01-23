/**
 * Invoice type definitions
 */

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'fixed' | 'percentage';
  taxable: boolean;
  subtotal: number;
  total: number;
  notes?: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  reference?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  invoiceNumber: string;
  title: string;
  description?: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  subtotal: number;
  discountAmount: number;
  discountType?: 'fixed' | 'percentage';
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate: Date;
  payments: InvoicePayment[];
  notes?: string;
  termsAndConditions?: string;
  jobId?: string;
  quoteId?: string;
  sentAt?: Date;
  viewedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface InvoiceWithCustomer extends Invoice {
  customerName: string;
  customerEmail: string;
}

export interface CreateInvoiceDto {
  customerId: string;
  title: string;
  description?: string;
  items: Omit<InvoiceItem, 'id' | 'subtotal' | 'total'>[];
  discountAmount?: number;
  discountType?: 'fixed' | 'percentage';
  dueDate: Date;
  notes?: string;
  termsAndConditions?: string;
  jobId?: string;
  quoteId?: string;
}
