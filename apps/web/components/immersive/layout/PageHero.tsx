'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { AnimatedGradientText } from '../clay/AnimatedGradientText';
import { useMotionSafe } from '../hooks/useMotionSafe';

interface PageHeroProps {
  badge: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
}

export function PageHero({ badge, title, titleAccent, subtitle }: PageHeroProps) {
  const { reduceMotion } = useMotionSafe();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, reduceMotion ? 0 : -40]);

  return (
    <section className="relative flex min-h-[40vh] items-center overflow-hidden pt-24 pb-12">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-blue/[0.06] via-transparent to-brand-amber/[0.04] dark:from-brand-blue/20 dark:to-brand-amber/10"
        aria-hidden
      />
      <motion.div className="relative z-10 mx-auto max-w-7xl px-6" style={{ y }}>
        <motion.span
          className="mb-4 inline-block rounded-[var(--public-radius-pill)] border border-brand-amber/40 bg-brand-amber/10 px-4 py-1.5 text-xs font-medium text-brand-amber"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {badge}
        </motion.span>
        <motion.h1
          className="font-display text-4xl font-bold text-foreground md:text-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {title}
          {titleAccent && (
            <>
              {' '}
              <AnimatedGradientText>{titleAccent}</AnimatedGradientText>
            </>
          )}
        </motion.h1>
        <motion.p
          className="mt-4 max-w-2xl text-lg text-muted"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
      </motion.div>
    </section>
  );
}
