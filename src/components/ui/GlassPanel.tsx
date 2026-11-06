import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSubbuStore } from '../../store/useSubbuStore';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
  subtle?: boolean;
  className?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  elevated = false,
  subtle = false,
  className,
  ...props
}) => {
  const reducedGpu = useSubbuStore((state) => state.reducedGpu);

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-3xl border transition-all duration-300',
          reducedGpu
            ? 'bg-[#FDFBF9] border-sakura-200 shadow-sm'
            : elevated
            ? 'bg-white/85 backdrop-blur-elevated border-white/90 shadow-glass'
            : subtle
            ? 'bg-white/50 backdrop-blur-md border-white/60 shadow-sm'
            : 'bg-white/72 backdrop-blur-glass border-white/85 shadow-glass',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

