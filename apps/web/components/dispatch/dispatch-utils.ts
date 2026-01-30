export function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase();
}

export function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes('IN_PROGRESS')) return 'bg-blue-500/15 text-blue-600';
  if (normalized.includes('CONFIRMED')) return 'bg-emerald-500/15 text-emerald-600';
  if (normalized.includes('COMPLETED')) return 'bg-green-500/15 text-green-600';
  if (normalized.includes('CANCELLED') || normalized.includes('NO_SHOW')) {
    return 'bg-red-500/15 text-red-600';
  }
  return 'bg-amber-500/15 text-amber-600';
}
