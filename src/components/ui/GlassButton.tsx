import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
  active?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  active = false,
  children,
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2 text-sm rounded-2xl gap-2',
    lg: 'px-6 py-3 text-base rounded-3xl gap-2.5',
    icon: 'p-2.5 rounded-2xl aspect-square flex items-center justify-center',
  };

  const variantClasses = {
    primary:
      'bg-sakura-300 text-ink-primary font-medium hover:bg-sakura-400 active:scale-95 shadow-sm border border-white/60 hover:shadow-md',
    secondary:
      'bg-white/70 hover:bg-white/90 text-ink-primary border border-white/80 active:scale-95 shadow-sm hover:border-sakura-300',
    ghost:
      'bg-transparent hover:bg-white/40 text-ink-secondary hover:text-ink-primary border border-transparent hover:border-white/50 active:scale-95',
    danger:
      'bg-status-errorBg text-status-errorText hover:bg-rose-100 border border-rose-200 active:scale-95 shadow-sm',
  };

  const activeClasses = active
    ? 'bg-sakura-200 border-sakura-400 text-sakura-700 shadow-sm'
    : '';

  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-sans transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          sizeClasses[size],
          variantClasses[variant],
          activeClasses,
          className
        )
      )}
      {...props}
    >
      {children}
    </button>
  );
};

