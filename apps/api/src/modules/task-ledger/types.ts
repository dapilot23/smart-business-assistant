// Task Ledger Types

export const TASK_LEDGER_QUEUE = 'task-ledger';

export enum TaskLedgerType {
  AI_ACTION = 'AI_ACTION',
  SYSTEM_TASK = 'SYSTEM_TASK',
  HUMAN_TASK = 'HUMAN_TASK',
  APPROVAL = 'APPROVAL',
}

export enum TaskLedgerCategory {
  BILLING = 'BILLING',
  SCHEDULING = 'SCHEDULING',
  MESSAGING = 'MESSAGING',
  MARKETING = 'MARKETING',
  OPERATIONS = 'OPERATIONS',
}

export enum TaskLedgerStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  UNDONE = 'UNDONE',
}

// Common action types that can be executed
export enum TaskActionType {
  // Billing
  SEND_PAYMENT_REMINDER = 'SEND_PAYMENT_REMINDER',
  APPLY_LATE_FEE = 'APPLY_LATE_FEE',
  SEND_QUOTE_FOLLOWUP = 'SEND_QUOTE_FOLLOWUP',

  // Scheduling
  SEND_APPOINTMENT_CONFIRMATION = 'SEND_APPOINTMENT_CONFIRMATION',
  SEND_APPOINTMENT_REMINDER = 'SEND_APPOINTMENT_REMINDER',
  MARK_NO_SHOW = 'MARK_NO_SHOW',

  // Messaging
  SEND_SMS = 'SEND_SMS',
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_AI_RESPONSE = 'SEND_AI_RESPONSE',

  // Marketing
  SEND_REVIEW_REQUEST = 'SEND_REVIEW_REQUEST',
  SEND_WINBACK = 'SEND_WINBACK',
  SEND_CAMPAIGN = 'SEND_CAMPAIGN',

  // Operations
  ASSIGN_TECHNICIAN = 'ASSIGN_TECHNICIAN',
  UPDATE_JOB_STATUS = 'UPDATE_JOB_STATUS',
}

export interface TaskLedgerJob {
  taskId: string;
  tenantId: string;
  approvedBy?: string;
}

export interface CreateTaskOptions {
  tenantId: string;
  type: TaskLedgerType;
  category: TaskLedgerCategory;
  title: string;
  description?: string;
  icon?: string;
  priority?: number;
  entityType?: string;
  entityId?: string;
  actionType?: string;
  actionEndpoint?: string;
  payload?: Record<string, unknown>;
  scheduledFor?: Date;
  undoWindowMins?: number;
  undoEndpoint?: string;
  undoPayload?: Record<string, unknown>;
  aiConfidence?: number;
  aiReasoning?: string;
  aiModel?: string;
  idempotencyKey?: string;
  traceId?: string;
}

export interface TaskStats {
  pending: number;
  approvals: number;
  completedToday: number;
  failedToday: number;
}

export interface ExecuteTaskResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}
