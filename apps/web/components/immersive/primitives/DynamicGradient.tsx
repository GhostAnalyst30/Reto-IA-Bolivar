'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useMotionSafe } from '../hooks/useMotionSafe';
import { cn } from '@/lib/utils';

interface DynamicGradientProps {
  className?: string;
  variant?: 'blue' | 'amber' | 'mixed';
}

export function DynamicGradient({ className, variant = 'mixed' }: DynamicGradientProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const { reduceMotion } = useMotionSafe();

  const opacityRange = reduceMotion ? [0.7, 0.7, 0.7] : [0.45, 0.65, 0.45];
  const y = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], opacityRange);

  const gradients = {
    blue: 'bg-gradient-to-br from-brand-blue via-brand-blue/80 to-brand-blue-light/30 dark:from-brand-blue dark:via-brand-blue/90 dark:to-brand-blue-light/15',
    amber: 'bg-gradient-to-br from-brand-amber/30 via-brand-blue/40 to-brand-blue dark:from-brand-amber/20 dark:via-brand-blue/60 dark:to-brand-blue',
    mixed: 'bg-gradient-to-br from-brand-blue via-brand-blue/80 to-brand-amber/25 dark:from-brand-blue/90 dark:via-brand-blue/70 dark:to-brand-amber/15',
  };

  return (
    <motion.div
      ref={ref}
      className={cn('absolute inset-0 gpu-layer', gradients[variant], className)}
      style={{ y, opacity }}
      aria-hidden
    />
  );
}
