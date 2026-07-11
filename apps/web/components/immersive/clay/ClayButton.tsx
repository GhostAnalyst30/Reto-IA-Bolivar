'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMotionSafe } from '../hooks/useMotionSafe';

interface ClayButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'light';
  href?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'px-4 py-2 text-sm min-h-[44px]',
  md: 'px-6 py-3 text-base min-h-[44px]',
  lg: 'px-8 py-4 text-lg min-h-[48px]',
};

export function ClayButton({
  children,
  variant = 'primary',
  href,
  className,
  size = 'md',
  type = 'button',
  disabled,
  onClick,
}: ClayButtonProps) {
  const { reduceMotion } = useMotionSafe();

  const styles = cn(
    'inline-flex items-center justify-center rounded-[var(--public-radius-sm)] font-medium transition-colors',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue',
    sizeClasses[size],
    variant === 'primary' && 'bg-brand-amber text-white clay-button',
    variant === 'outline' && 'border-2 border-brand-blue-mid bg-brand-surface text-brand-blue-mid clay-button-outline',
    variant === 'light' && 'border border-white/30 bg-white/10 text-white clay-button-outline',
    disabled && 'opacity-50 pointer-events-none',
    className
  );

  const motionProps = reduceMotion
    ? {}
    : {
        whileHover: { scale: 1.02, transition: { type: 'spring' as const, stiffness: 200 } },
        whileTap: { scale: 0.96, transition: { type: 'spring' as const, stiffness: 400 } },
      };

  if (href) {
    return (
      <motion.div {...motionProps} className="inline-flex">
        <Link href={href} className={styles}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button type={type} className={styles} disabled={disabled} onClick={onClick} {...motionProps}>
      {children}
    </motion.button>
  );
}
