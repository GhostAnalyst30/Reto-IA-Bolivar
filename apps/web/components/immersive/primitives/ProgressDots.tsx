'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressDotsProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressDots({ current, total, className }: ProgressDotsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)} aria-label="Progreso de sección">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            'h-2 rounded-full transition-colors',
            i === current ? 'w-8 bg-brand-amber' : 'w-2 bg-brand-border'
          )}
          animate={{ scale: i === current ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          aria-current={i === current ? 'step' : undefined}
        />
      ))}
    </div>
  );
}
