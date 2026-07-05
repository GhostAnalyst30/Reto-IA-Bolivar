'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}

export function BentoGrid({ children, className, cols = 3 }: BentoGridProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'grid gap-4',
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 sm:grid-cols-2',
        cols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface BentoCellProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  animate?: boolean;
}

export function BentoCell({ children, className, colSpan = 1, rowSpan = 1, animate = true }: BentoCellProps) {
  const reduceMotion = useReducedMotion();
  const spanClasses = cn(
    colSpan === 2 && 'sm:col-span-2',
    colSpan === 3 && 'sm:col-span-2 lg:col-span-3',
    rowSpan === 2 && 'sm:row-span-2'
  );

  const content = (
    <div
      className={cn(
        'rounded-sm border border-brand-border bg-brand-surface p-5 transition-transform hover:scale-[1.005]',
        'shadow-sm hover:shadow-md hover:border-brand-blue-light/50',
        spanClasses,
        className
      )}
    >
      {children}
    </div>
  );

  if (!animate || reduceMotion) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={spanClasses}
    >
      {content}
    </motion.div>
  );
}
