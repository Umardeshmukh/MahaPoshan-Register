import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'emerald';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-amber-700 hover:bg-amber-800 text-white shadow-xs focus:ring-amber-500 active:scale-[0.98]',
  secondary:
    'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 focus:ring-slate-400 active:scale-[0.98]',
  outline:
    'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 focus:ring-amber-500 active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400 active:scale-[0.98]',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500 active:scale-[0.98]',
  emerald:
    'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs focus:ring-emerald-500 active:scale-[0.98]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 min-h-[38px] text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2 min-h-[44px] text-xs sm:text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 min-h-[48px] text-sm sm:text-base rounded-xl gap-2.5 font-bold',
  icon: 'p-2.5 min-w-[40px] min-h-[40px] rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
