import { Icon } from "@/app/components/Icon";

interface StatsCardProps {
  icon: 'dollar-sign' | 'calendar' | 'users' | 'phone' | 'file-text' | 'briefcase';
  label: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
}

export function StatsCard({ icon, label, value, change, prefix = '', suffix = '' }: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const changeDisplay = change !== undefined
    ? `${isPositive ? '+' : ''}${change.toFixed(1)}%`
    : null;

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] border border-[var(--border)] shadow-sm rounded-lg overflow-hidden">
      <div className="p-5 flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--primary)]/10">
          <Icon name={icon} size={24} className="text-[var(--primary)]" />
        </div>
        <div className="flex-1">
          <p className="font-secondary text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="font-primary text-2xl font-semibold text-[var(--foreground)] mt-1">
            {prefix}{value}{suffix}
          </p>
        </div>
      </div>

      {changeDisplay && (
        <div className="px-5 pb-4">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
            isPositive
              ? 'bg-[var(--color-success)]/10'
              : 'bg-red-500/10'
          }`}>
            <Icon
              name={isPositive ? 'trending-up' : 'trending-up'}
              size={14}
              className={isPositive ? 'text-[var(--color-success)]' : 'text-red-500'}
            />
            <span className={`font-secondary text-xs font-medium ${
              isPositive
                ? 'text-[var(--color-success)]'
                : 'text-red-500'
            }`}>
              {changeDisplay} from last month
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
