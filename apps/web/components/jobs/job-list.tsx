'use client';

import { Job } from '@/lib/types/jobs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { JobStatusBadge } from './job-status-badge';
import { useRouter } from 'next/navigation';

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  const router = useRouter();

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No jobs found. Create a job from an appointment to get started.
      </div>
    );
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-3 p-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-medium text-sm">
                {job.appointment?.customer_name || 'Unknown Customer'}
              </div>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {job.appointment?.service || 'No service specified'}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatDate(job.appointment?.scheduled_start)}</span>
              <span>{job.appointment?.technician_name || 'Unassigned'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Technician</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow
                key={job.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
              >
                <TableCell>
                  <JobStatusBadge status={job.status} />
                </TableCell>
                <TableCell className="font-medium">
                  {job.appointment?.customer_name}
                </TableCell>
                <TableCell>{job.appointment?.service}</TableCell>
                <TableCell>{formatDate(job.appointment?.scheduled_start)}</TableCell>
                <TableCell>
                  {job.appointment?.technician_name || 'Unassigned'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
