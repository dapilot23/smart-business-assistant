// Event Catalog - All domain events in the system

export const EVENTS = {
  // Appointment Events
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_REMINDER_DUE: 'appointment.reminder.due',

  // Job Events
  JOB_CREATED: 'job.created',
  JOB_STARTED: 'job.started',
  JOB_COMPLETED: 'job.completed',
  JOB_CANCELLED: 'job.cancelled',

  // Payment Events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_OVERDUE: 'invoice.overdue',

  // Quote Events
  QUOTE_CREATED: 'quote.created',
  QUOTE_SENT: 'quote.sent',
  QUOTE_ACCEPTED: 'quote.accepted',
  QUOTE_REJECTED: 'quote.rejected',

  // Customer Events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',

  // Review Events
  REVIEW_REQUEST_SENT: 'review.request.sent',
  REVIEW_RECEIVED: 'review.received',

  // NPS Events
  NPS_SURVEY_SENT: 'nps.survey.sent',
  NPS_SCORE_SUBMITTED: 'nps.score.submitted',
  NPS_LOW_SCORE_ALERT: 'nps.low_score.alert',
  NPS_REVIEW_CLICKED: 'nps.review.clicked',

  // Retention Events
  RETENTION_TRIGGERED: 'retention.triggered',
  RETENTION_COMPLETED: 'retention.completed',

  // Messaging Events
  MESSAGE_RECEIVED: 'message.received',

  // Business Profile Events (Business DNA System)
  BUSINESS_PROFILE_CREATED: 'business_profile.created',
  BUSINESS_PROFILE_UPDATED: 'business_profile.updated',
  BUSINESS_PROFILE_COMPLETED: 'business_profile.completed',
  BUSINESS_PROFILE_REVALIDATED: 'business_profile.revalidated',
  PROFILE_OBSERVATION_UPDATED: 'business_profile.observation_updated',
  PROFILE_DISCREPANCY_DETECTED: 'business_profile.discrepancy_detected',
  PROFILE_CONFIDENCE_LOW: 'business_profile.confidence_low',

  // Task Ledger Events
  TASK_LEDGER_CREATED: 'task_ledger.created',
  TASK_LEDGER_APPROVED: 'task_ledger.approved',
  TASK_LEDGER_DECLINED: 'task_ledger.declined',
  TASK_LEDGER_COMPLETED: 'task_ledger.completed',
  TASK_LEDGER_FAILED: 'task_ledger.failed',
  TASK_LEDGER_UNDONE: 'task_ledger.undone',
  TASK_LEDGER_EXECUTED: 'task_ledger.executed',
  TASK_LEDGER_UNDO_REQUESTED: 'task_ledger.undo_requested',

  // Task Ledger Action Events (emitted by processor)
  PAYMENT_REMINDER_REQUESTED: 'task_ledger.action.payment_reminder',
  LATE_FEE_REQUESTED: 'task_ledger.action.late_fee',
  QUOTE_FOLLOWUP_REQUESTED: 'task_ledger.action.quote_followup',
  APPOINTMENT_CONFIRMATION_REQUESTED: 'task_ledger.action.appointment_confirmation',
  APPOINTMENT_REMINDER_REQUESTED: 'task_ledger.action.appointment_reminder',
  NO_SHOW_REQUESTED: 'task_ledger.action.no_show',
  SMS_REQUESTED: 'task_ledger.action.sms',
  EMAIL_REQUESTED: 'task_ledger.action.email',
  AI_RESPONSE_REQUESTED: 'task_ledger.action.ai_response',
  REVIEW_REQUEST_REQUESTED: 'task_ledger.action.review_request',
  WINBACK_REQUESTED: 'task_ledger.action.winback',
  CAMPAIGN_SEND_REQUESTED: 'task_ledger.action.campaign_send',
  TECHNICIAN_ASSIGNMENT_REQUESTED: 'task_ledger.action.technician_assignment',
  JOB_STATUS_UPDATE_REQUESTED: 'task_ledger.action.job_status_update',
  TASK_ACTION_REQUESTED: 'task_ledger.action.generic',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

// Event Payloads
export interface BaseEventPayload {
  tenantId: string;
  timestamp: Date;
  correlationId?: string;
}

export interface AppointmentEventPayload extends BaseEventPayload {
  appointmentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  scheduledAt: Date;
  serviceName?: string;
  assignedToId?: string;
  assignedToName?: string;
}

export interface JobEventPayload extends BaseEventPayload {
  jobId: string;
  appointmentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  technicianId?: string;
  technicianName?: string;
  status: string;
}

export interface PaymentEventPayload extends BaseEventPayload {
  invoiceId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  amount: number;
  currency: string;
}

export interface QuoteEventPayload extends BaseEventPayload {
  quoteId: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  validUntil: Date;
}

export interface CustomerEventPayload extends BaseEventPayload {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export interface ReviewEventPayload extends BaseEventPayload {
  reviewRequestId: string;
  jobId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
}

export interface InvoiceEventPayload extends BaseEventPayload {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  amount: number;
}

export interface NpsEventPayload extends BaseEventPayload {
  surveyId?: string;
  jobId: string;
  customerId?: string;
  score?: number;
  feedback?: string;
  admins?: string[];
}

export interface RetentionEventPayload extends BaseEventPayload {
  campaignId: string;
  customerId: string;
  customerName: string;
  type: string;
  step: number;
}

export interface MessageEventPayload extends BaseEventPayload {
  conversationId: string;
  messageId: string;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  skipAi?: boolean;
}

// Business Profile Events (Business DNA System)
export interface BusinessProfileEventPayload extends BaseEventPayload {
  profileId: string;
  changedFields?: string[];
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  confidence?: number;
}

export interface ProfileDiscrepancyPayload extends BaseEventPayload {
  profileId: string;
  discrepancies: Array<{
    field: string;
    stated: unknown;
    observed: unknown;
    significance: number;
  }>;
}

export interface ProfileObservationPayload extends BaseEventPayload {
  profileId: string;
  observedMetrics: {
    avgJobValue?: number;
    jobsPerWeek?: number;
    peakMonths?: number[];
    slowMonths?: number[];
    avgResponseTime?: number;
    channelMix?: Record<string, number>;
    serviceMix?: Record<string, number>;
  };
}

// Task Ledger Events
export interface TaskLedgerEventPayload extends BaseEventPayload {
  taskId?: string;
  type?: string | null;
  category?: string | null;
  actionType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  success?: boolean;
  error?: string;
  approvedBy?: string;
  declinedBy?: string;
  reason?: string;
  endpoint?: string | null;
  payload?: unknown;
}

export interface TaskActionEventPayload extends BaseEventPayload {
  actionType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | unknown;
  // Specific entity IDs based on action type
  invoiceId?: string | null;
  quoteId?: string | null;
  appointmentId?: string | null;
  customerId?: string | null;
  campaignId?: string | null;
  jobId?: string | null;
}
