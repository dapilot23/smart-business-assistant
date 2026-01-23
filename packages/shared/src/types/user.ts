/**
 * User type definitions
 */

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  VIEWER = 'viewer',
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageCustomers: boolean;
  canManageAppointments: boolean;
  canManageQuotes: boolean;
  canManageInvoices: boolean;
  canManageJobs: boolean;
  canViewReports: boolean;
}
