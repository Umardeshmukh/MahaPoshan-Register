import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'amber';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  warning: 'bg-amber-100 text-amber-900 border-amber-300',
  danger: 'bg-rose-100 text-rose-800 border-rose-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  neutral: 'bg-slate-100 text-slate-700 border-slate-300',
  amber: 'bg-amber-50 text-amber-900 border-amber-200',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] sm:text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-lg border leading-none shrink-0 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
