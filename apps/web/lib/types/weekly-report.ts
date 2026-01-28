export interface ReportKeyMetrics {
  revenue: number;
  revenueChange?: number;
  jobsCompleted: number;
  appointmentCompletionRate: number;
  quoteConversionRate: number;
  npsScore: number;
}

export interface ReportData {
  keyMetrics: ReportKeyMetrics;
  topWins: string[];
  areasNeedingAttention: string[];
  actionItems: string[];
  forecast: string;
}

export interface WeeklyReport {
  id: string;
  tenantId: string;
  weekStart: string;
  report: ReportData;
  sent: boolean;
  sentAt?: string;
  createdAt: string;
}

export interface WeeklyReportSummary {
  id: string;
  weekStart: string;
  createdAt: string;
}
