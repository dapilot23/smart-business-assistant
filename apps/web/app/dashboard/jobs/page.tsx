'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { JobList } from '@/components/jobs/job-list';
import { Job, JobStatus, JobFilters } from '@/lib/types/jobs';
import { getJobs } from '@/lib/api/jobs';
import { Loader2, Briefcase, Filter } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<JobFilters>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getJobs(filters);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleApplyFilters = () => {
    setFilters({
      status: statusFilter !== 'all' ? (statusFilter as JobStatus) : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setFilters({});
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)]">Jobs</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Track jobs in progress.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Filters Card */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                Filters
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Filter jobs by status and date range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                      <SelectItem value="EN_ROUTE">En Route</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Date From</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9 sm:h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Date To</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 sm:h-10"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={handleApplyFilters} className="flex-1 h-9 sm:h-10 text-sm">
                    Apply
                  </Button>
                  <Button onClick={handleResetFilters} variant="outline" className="h-9 sm:h-10 text-sm">
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              {error}
            </div>
          )}

          {/* Jobs List Card */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                Jobs ({jobs.length})
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Click on a job to view details and update status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <JobList jobs={jobs} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
