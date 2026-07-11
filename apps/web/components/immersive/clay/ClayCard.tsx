'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionSafe } from '../hooks/useMotionSafe';

interface ClayCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hover3d?: boolean;
}

export function ClayCard({ children, className, hover3d = true, ...props }: ClayCardProps) {
  const { reduceMotion } = useMotionSafe();

  return (
    <motion.div
      className={cn(
        'relative rounded-[var(--public-radius-md)] border border-brand-border bg-brand-surface p-6 md:p-8 clay-surface',
        className
      )}
      whileHover={
        reduceMotion || !hover3d
          ? undefined
          : {
              scale: 1.01,
              y: -2,
              transition: { type: 'spring', stiffness: 200, damping: 20 },
            }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
