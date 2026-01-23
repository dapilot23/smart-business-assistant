/**
 * Customer type definitions
 */

export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CustomerContact {
  type: 'email' | 'phone' | 'mobile' | 'fax';
  value: string;
  isPrimary: boolean;
  label?: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  type: 'individual' | 'business';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: CustomerAddress;
  contacts?: CustomerContact[];
  notes?: string;
  tags?: string[];
  source?: string;
  status: 'active' | 'inactive' | 'archived';
  totalRevenue?: number;
  totalInvoices?: number;
  totalJobs?: number;
  lastContactDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'individual' | 'business';
  status: 'active' | 'inactive' | 'archived';
}
