'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionSafe } from '../hooks/useMotionSafe';

interface ClayFormCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ClayFormCard({ children, className }: ClayFormCardProps) {
  const { reduceMotion } = useMotionSafe();

  return (
    <motion.div
      className={cn(
        'w-full max-w-md rounded-[var(--public-radius-md)] border border-brand-border bg-brand-surface p-8 clay-surface',
        className
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
