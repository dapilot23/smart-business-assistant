export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

export function generateTimeSlots(
  startHour = 8,
  endHour = 18,
  intervalMinutes = 30
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      slots.push({
        hour,
        minute,
        label: formatTime(hour, minute),
      });
    }
  }

  return slots;
}

export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

export function getWeekDays(date: Date): Date[] {
  const week: Date[] = [];
  const current = new Date(date);
  current.setDate(current.getDate() - current.getDay());

  for (let i = 0; i < 7; i++) {
    week.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return week;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: 'border border-sky-400/40 bg-sky-400/10 text-sky-200',
    confirmed: 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    in_progress: 'border border-amber-400/40 bg-amber-400/10 text-amber-200',
    completed: 'border border-white/10 bg-white/5 text-slate-300',
    cancelled: 'border border-rose-400/40 bg-rose-400/10 text-rose-200',
  };
  return colors[status] || colors.scheduled;
}
