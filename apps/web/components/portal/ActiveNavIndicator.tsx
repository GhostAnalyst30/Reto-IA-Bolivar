'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ActiveNavIndicatorProps {
  active: boolean;
  className?: string;
}

export function ActiveNavIndicator({ active, className }: ActiveNavIndicatorProps) {
  const reduceMotion = useReducedMotion();

  if (!active) return null;

  if (reduceMotion) {
    return (
      <span
        className={cn('absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full', className)}
        style={{ backgroundColor: 'var(--portal-accent)' }}
        aria-hidden
      />
    );
  }

  return (
    <motion.span
      layoutId="portal-nav-indicator"
      className={cn('absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full', className)}
      style={{ backgroundColor: 'var(--portal-accent)' }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      aria-hidden
    />
  );
}
