import React from 'react';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'amber' | 'emerald' | 'blue';
  className?: string;
  badge?: React.ReactNode;
}

const variantStyles = {
  default: {
    container: 'bg-white border-slate-200/90 text-slate-900',
    icon: 'bg-slate-100 text-slate-700 border-slate-200',
    value: 'text-slate-900',
  },
  amber: {
    container: 'bg-amber-50/40 border-amber-200/80 text-amber-950',
    icon: 'bg-amber-100 text-amber-900 border-amber-200',
    value: 'text-amber-950',
  },
  emerald: {
    container: 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950',
    icon: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    value: 'text-emerald-950',
  },
  blue: {
    container: 'bg-blue-50/40 border-blue-200/80 text-blue-950',
    icon: 'bg-blue-100 text-blue-800 border-blue-200',
    value: 'text-blue-950',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  variant = 'default',
  className = '',
  badge,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs ${styles.container} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
          {label}
        </span>
        {badge}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${styles.value}`}>
          {value}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl border shrink-0 ${styles.icon}`}>
            {icon}
          </div>
        )}
      </div>

      {subtext && (
        <p className="text-[11px] text-slate-500 mt-1 font-medium">{subtext}</p>
      )}
    </div>
  );
};
