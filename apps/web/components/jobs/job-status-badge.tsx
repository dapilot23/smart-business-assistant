import { Badge } from '@/components/ui/badge';
import { JobStatus } from '@/lib/types/jobs';

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

const statusConfig: Record<JobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  NOT_STARTED: { label: 'Not Started', variant: 'secondary' },
  EN_ROUTE: { label: 'En Route', variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  ON_HOLD: { label: 'On Hold', variant: 'outline' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
