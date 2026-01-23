/**
 * Job type definitions
 */

export enum JobStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface JobNote {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
}

export interface JobAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByName?: string;
}

export interface Job {
  id: string;
  tenantId: string;
  customerId: string;
  assignedToUserId?: string;
  jobNumber: string;
  title: string;
  description?: string;
  status: JobStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  location?: string;
  quoteId?: string;
  invoiceId?: string;
  notes: JobNote[];
  attachments: JobAttachment[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface JobWithRelations extends Job {
  customerName: string;
  customerEmail: string;
  assignedToUserName?: string;
}

export interface CreateJobDto {
  customerId: string;
  assignedToUserId?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  estimatedHours?: number;
  location?: string;
  quoteId?: string;
  tags?: string[];
}
