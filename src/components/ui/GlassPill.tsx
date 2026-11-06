import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassPillProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export const GlassPill: React.FC<GlassPillProps> = ({
  children,
  active = false,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200',
          active
            ? 'bg-sakura-100 text-sakura-700 border-sakura-300 shadow-sm'
            : 'bg-white/60 text-ink-secondary border-white/70 hover:bg-white/80 hover:text-ink-primary',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

