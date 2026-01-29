import { memo } from "react";
import { Icon } from "@/app/components/Icon";

interface StatsCardProps {
  icon: 'dollar-sign' | 'calendar' | 'users' | 'phone' | 'file-text' | 'briefcase';
  label: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
  color?: 'primary' | 'success' | 'info' | 'warning' | 'purple' | 'cyan';
}

const colorStyles = {
  primary: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    icon: 'text-primary',
    glow: 'shadow-[0_0_20px_-5px_var(--primary)]',
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    icon: 'text-success',
    glow: 'shadow-[0_0_20px_-5px_var(--color-success)]',
  },
  info: {
    bg: 'bg-info/10',
    border: 'border-info/20',
    icon: 'text-info',
    glow: 'shadow-[0_0_20px_-5px_var(--color-info)]',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    icon: 'text-warning',
    glow: 'shadow-[0_0_20px_-5px_var(--color-warning)]',
  },
  purple: {
    bg: 'bg-purple/10',
    border: 'border-purple/20',
    icon: 'text-purple',
    glow: 'shadow-[0_0_20px_-5px_var(--color-purple)]',
  },
  cyan: {
    bg: 'bg-cyan/10',
    border: 'border-cyan/20',
    icon: 'text-cyan',
    glow: 'shadow-[0_0_20px_-5px_var(--color-cyan)]',
  },
};

export const StatsCard = memo(function StatsCard({ icon, label, value, change, prefix = '', suffix = '', color = 'primary' }: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const changeDisplay = change !== undefined
    ? `${isPositive ? '+' : ''}${change.toFixed(1)}%`
    : null;

  const styles = colorStyles[color];

  return (
    <div className={`flex-1 flex flex-col bg-card border ${styles.border} rounded-xl overflow-hidden transition-all duration-300 hover:border-opacity-50 card-interactive`}>
      <div className="p-4 sm:p-5 flex items-center gap-3">
        <div className={`flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${styles.bg} ${styles.border} border`}>
          <Icon name={icon} size={22} className={styles.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-secondary text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
          <p className="font-primary text-xl sm:text-2xl font-semibold text-foreground mt-0.5 truncate">
            {prefix}{value}{suffix}
          </p>
        </div>
      </div>

      {changeDisplay && (
        <div className="px-4 sm:px-5 pb-4">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
            isPositive
              ? 'bg-success/10 border border-success/20'
              : 'bg-destructive/10 border border-destructive/20'
          }`}>
            <Icon
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={14}
              className={isPositive ? 'text-success' : 'text-destructive'}
            />
            <span className={`font-secondary text-xs font-medium ${
              isPositive
                ? 'text-success'
                : 'text-destructive'
            }`}>
              {changeDisplay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
