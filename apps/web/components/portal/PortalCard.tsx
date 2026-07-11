'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PortalCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

export function PortalCard({ children, className, ...props }: PortalCardProps) {
  return (
    <motion.div
      className={cn(
        'rounded-[var(--portal-radius,0.25rem)] border border-brand-border bg-brand-surface p-5 text-foreground clay-lite transition-transform',
        className
      )}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
