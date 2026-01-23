/**
 * Tenant type definitions
 */

export interface TenantSettings {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress?: string;
  businessLogo?: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  taxRate?: number;
  taxLabel?: string;
  emailNotifications: {
    appointmentReminders: boolean;
    quoteUpdates: boolean;
    invoiceReminders: boolean;
    jobUpdates: boolean;
  };
  smsNotifications: {
    appointmentReminders: boolean;
    invoiceReminders: boolean;
  };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };
}

export interface Tenant {
  id: string;
  subdomain: string;
  settings: TenantSettings;
  subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'suspended' | 'cancelled';
  billingEmail?: string;
  maxUsers: number;
  maxCustomers: number;
  createdAt: Date;
  updatedAt: Date;
}
