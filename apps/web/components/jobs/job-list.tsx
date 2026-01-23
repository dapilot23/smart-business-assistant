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
      <div className="text-center py-8 text-muted-foreground">
        No jobs found. Create a job from an appointment to get started.
      </div>
    );
  }

  return (
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
            <TableCell>
              {job.appointment?.scheduled_start
                ? new Date(job.appointment.scheduled_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '-'}
            </TableCell>
            <TableCell>
              {job.appointment?.technician_name || 'Unassigned'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
