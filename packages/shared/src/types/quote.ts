/**
 * Quote type definitions
 */

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export interface QuoteItem {
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

export interface QuoteTotals {
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
}

export interface Quote {
  id: string;
  tenantId: string;
  customerId: string;
  quoteNumber: string;
  title: string;
  description?: string;
  items: QuoteItem[];
  status: QuoteStatus;
  subtotal: number;
  discountAmount: number;
  discountType?: 'fixed' | 'percentage';
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: Date;
  notes?: string;
  termsAndConditions?: string;
  sentAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface QuoteWithCustomer extends Quote {
  customerName: string;
  customerEmail: string;
}

export interface CreateQuoteDto {
  customerId: string;
  title: string;
  description?: string;
  items: Omit<QuoteItem, 'id' | 'subtotal' | 'total'>[];
  discountAmount?: number;
  discountType?: 'fixed' | 'percentage';
  validUntil: Date;
  notes?: string;
  termsAndConditions?: string;
}
