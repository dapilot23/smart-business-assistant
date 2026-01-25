'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { JobStatusSelect } from '@/components/jobs/job-status-select';
import { JobPhotos } from '@/components/jobs/job-photos';
import { PhotoUploadModal } from '@/components/jobs/photo-upload-modal';
import { JobNotes } from '@/components/jobs/job-notes';
import { Job, JobPhotoType, JobStatus } from '@/lib/types/jobs';
import {
  getJob,
  updateJobStatus,
  startJob,
  completeJob,
  addJobNotes,
  uploadJobPhoto,
  deleteJobPhoto,
} from '@/lib/api/jobs';
import {
  Loader2,
  ArrowLeft,
  Play,
  CheckCircle,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Complete job form state
  const [workSummary, setWorkSummary] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const fetchJob = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getJob(jobId);
      setJob(data);
      setWorkSummary(data.work_summary || '');
      setMaterialsUsed(data.materials_used || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    setIsUpdating(true);
    try {
      await updateJobStatus(jobId, { status: newStatus as JobStatus });
      await fetchJob();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartJob = async () => {
    setIsUpdating(true);
    try {
      await startJob(jobId);
      await fetchJob();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start job');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!workSummary.trim()) {
      alert('Work summary is required');
      return;
    }

    setIsUpdating(true);
    try {
      await completeJob(jobId, {
        work_summary: workSummary,
        materials_used: materialsUsed || undefined,
      });
      await fetchJob();
      setShowCompleteForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete job');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (content: string) => {
    await addJobNotes(jobId, { content });
    await fetchJob();
  };

  const handlePhotoUpload = async (
    file: File,
    type: JobPhotoType,
    caption?: string
  ) => {
    await uploadJobPhoto(jobId, file, { photo_type: type, caption });
    await fetchJob();
  };

  const handlePhotoDelete = async (photoId: string) => {
    try {
      await deleteJobPhoto(jobId, photoId);
      await fetchJob();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-destructive">{error || 'Job not found'}</div>
        <Button onClick={() => router.push('/dashboard/jobs')}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  const canEdit = job.status !== 'COMPLETED' && job.status !== 'CANCELLED';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/jobs')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Job Details
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {job.appointment?.customer_name} - {job.appointment?.service}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && job.status === 'NOT_STARTED' && (
            <Button onClick={handleStartJob} disabled={isUpdating}>
              <Play className="h-4 w-4 mr-2" />
              Start Job
            </Button>
          )}
          {canEdit && job.status === 'IN_PROGRESS' && !showCompleteForm && (
            <Button onClick={() => setShowCompleteForm(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Job
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Status and Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Job Status</CardTitle>
                <JobStatusBadge status={job.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {canEdit && (
                <div className="space-y-2">
                  <Label>Change Status</Label>
                  <JobStatusSelect
                    value={job.status}
                    onChange={handleStatusChange}
                    disabled={isUpdating}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Started At</Label>
                  <p className="text-sm font-medium">
                    {job.started_at
                      ? new Date(job.started_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'Not started'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Completed At</Label>
                  <p className="text-sm font-medium">
                    {job.completed_at
                      ? new Date(job.completed_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'Not completed'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Appointment Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer & Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Customer</Label>
                      <p className="text-sm font-medium">
                        {job.appointment?.customer_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="text-sm font-medium">
                        {job.appointment?.customer_phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="text-sm font-medium">
                        {job.appointment?.customer_email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Scheduled</Label>
                      <p className="text-sm font-medium">
                        {job.appointment?.scheduled_start
                          ? new Date(job.appointment.scheduled_start).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="text-sm font-medium">
                        {job.appointment?.address || 'No address'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Technician</Label>
                      <p className="text-sm font-medium">
                        {job.appointment?.technician_name || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complete Job Form */}
          {showCompleteForm && (
            <Card>
              <CardHeader>
                <CardTitle>Complete Job</CardTitle>
                <CardDescription>
                  Provide work summary and materials used to complete this job
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="work-summary">
                    Work Summary <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="work-summary"
                    placeholder="Describe the work performed..."
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materials">Materials Used</Label>
                  <Textarea
                    id="materials"
                    placeholder="List materials and quantities used..."
                    value={materialsUsed}
                    onChange={(e) => setMaterialsUsed(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCompleteJob} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Complete Job
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCompleteForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work Summary (if completed) */}
          {job.work_summary && (
            <Card>
              <CardHeader>
                <CardTitle>Work Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{job.work_summary}</p>
                {job.materials_used && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-muted-foreground">Materials Used</Label>
                    <p className="text-sm whitespace-pre-wrap mt-2">
                      {job.materials_used}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          <Card>
            <CardContent className="pt-6">
              <JobPhotos
                photos={job.photos || []}
                onUpload={() => setIsPhotoModalOpen(true)}
                onDelete={handlePhotoDelete}
                canEdit={canEdit}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <JobNotes
                notes={job.notes || []}
                onAddNote={handleAddNote}
                canEdit={canEdit}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        open={isPhotoModalOpen}
        onOpenChange={setIsPhotoModalOpen}
        onUpload={handlePhotoUpload}
      />
    </div>
  );
}
