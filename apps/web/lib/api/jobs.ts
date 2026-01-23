import {
  Job,
  CreateJobDto,
  UpdateJobStatusDto,
  StartJobDto,
  CompleteJobDto,
  AddJobNoteDto,
  UploadJobPhotoDto,
  JobFilters,
} from '@/lib/types/jobs';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchWithAuth(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getJobs(filters?: JobFilters): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.technician_id) params.append('technician_id', filters.technician_id);
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const queryString = params.toString();
  const url = `${API_URL}/jobs${queryString ? `?${queryString}` : ''}`;
  return fetchWithAuth(url);
}

export async function getJob(id: string): Promise<Job> {
  return fetchWithAuth(`${API_URL}/jobs/${id}`);
}

export async function createJob(data: CreateJobDto): Promise<Job> {
  return fetchWithAuth(`${API_URL}/jobs`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateJobStatus(
  id: string,
  data: UpdateJobStatusDto
): Promise<Job> {
  return fetchWithAuth(`${API_URL}/jobs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function startJob(id: string, data?: StartJobDto): Promise<Job> {
  return fetchWithAuth(`${API_URL}/jobs/${id}/start`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function completeJob(id: string, data: CompleteJobDto): Promise<Job> {
  return fetchWithAuth(`${API_URL}/jobs/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addJobNotes(id: string, data: AddJobNoteDto): Promise<Job> {
  return fetchWithAuth(`${API_URL}/jobs/${id}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes: data.content }),
  });
}

export async function uploadJobPhoto(
  id: string,
  file: File,
  data: UploadJobPhotoDto
): Promise<Job> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', data.photo_type);
  if (data.caption) {
    formData.append('caption', data.caption);
  }

  const response = await fetch(`${API_URL}/jobs/${id}/photos`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function deleteJobPhoto(jobId: string, photoId: string): Promise<void> {
  return fetchWithAuth(`${API_URL}/jobs/${jobId}/photos/${photoId}`, {
    method: 'DELETE',
  });
}
