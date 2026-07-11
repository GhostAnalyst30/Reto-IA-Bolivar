'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { staggerContainer, staggerItem } from './SectionReveal';
import { useMotionSafe } from '../hooks/useMotionSafe';
import { cn } from '@/lib/utils';

interface ContentSectionProps {
  children: React.ReactNode;
  className?: string;
  gridClassName?: string;
}

export function ContentSection({ children, className, gridClassName }: ContentSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.1 });
  const { reduceMotion } = useMotionSafe();

  return (
    <div className={cn('mx-auto max-w-7xl px-6 pb-20', className)}>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={reduceMotion ? undefined : staggerContainer}
        className={gridClassName}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface ContentSectionItemProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentSectionItem({ children, className }: ContentSectionItemProps) {
  const { reduceMotion } = useMotionSafe();

  return (
    <motion.div variants={reduceMotion ? undefined : staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
