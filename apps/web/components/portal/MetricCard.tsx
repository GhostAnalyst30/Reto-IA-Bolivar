'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { PortalCard } from './PortalCard';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: string;
  className?: string;
}

export function MetricCard({ label, value, trend, className }: MetricCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <PortalCard className={className}>
      <p className="text-sm text-muted">{label}</p>
      <motion.p
        className="mt-2 text-2xl font-bold"
        style={{ color: 'var(--portal-accent)' }}
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.p>
      {trend && <p className="mt-1 text-sm text-green-600 dark:text-green-400">{trend}</p>}
    </PortalCard>
  );
}
