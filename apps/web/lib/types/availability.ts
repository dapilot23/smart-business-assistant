export interface WeeklySchedule {
  id: string;
  technician_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
}

export interface TimeOff {
  id: string;
  technician_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  created_at: string;
}

export interface CreateWeeklyScheduleData {
  technician_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface CreateTimeOffData {
  technician_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface UpdateTimeOffData {
  start_date?: string;
  end_date?: string;
  reason?: string;
}

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
