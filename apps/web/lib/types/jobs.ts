export type JobStatus =
  | 'NOT_STARTED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export type JobPhotoType = 'BEFORE' | 'DURING' | 'AFTER';

export interface Job {
  id: string;
  appointment_id: string;
  status: JobStatus;
  started_at?: string;
  completed_at?: string;
  work_summary?: string;
  materials_used?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
  appointment?: {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    service: string;
    scheduled_start: string;
    scheduled_end: string;
    address: string;
    technician_id?: string;
    technician_name?: string;
  };
  photos?: JobPhoto[];
  notes?: JobNote[];
}

export interface JobPhoto {
  id: string;
  job_id: string;
  file_url: string;
  photo_type: JobPhotoType;
  caption?: string;
  uploaded_at: string;
}

export interface JobNote {
  id: string;
  job_id: string;
  content: string;
  created_by_name: string;
  created_at: string;
}

export interface CreateJobDto {
  appointment_id: string;
}

export interface UpdateJobStatusDto {
  status: JobStatus;
}

export interface StartJobDto {
  started_at?: string;
}

export interface CompleteJobDto {
  work_summary: string;
  materials_used?: string;
  completed_at?: string;
}

export interface AddJobNoteDto {
  content: string;
}

export interface UploadJobPhotoDto {
  photo_type: JobPhotoType;
  caption?: string;
}

export interface JobFilters {
  status?: JobStatus;
  technician_id?: string;
  date_from?: string;
  date_to?: string;
}
