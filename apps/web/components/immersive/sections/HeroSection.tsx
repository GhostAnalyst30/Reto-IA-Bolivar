'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui';
import { AnimatedGradientText } from '../clay/AnimatedGradientText';
import { ClayButton } from '../clay/ClayButton';
import { HERO_KEYWORDS } from '../data/landing-content';
import { useMotionSafe } from '../hooks/useMotionSafe';

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const [keywordIdx, setKeywordIdx] = useState(0);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const { reduceMotion } = useMotionSafe();

  const y2 = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [1, reduceMotion ? 1 : 0]);
  const scale = useTransform(scrollYProgress, [0, 0.35], [1, reduceMotion ? 1 : 0.96]);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduceMotion) return;
    const idx = Math.min(
      Math.floor(v * HERO_KEYWORDS.length * 1.5),
      HERO_KEYWORDS.length - 1
    );
    setKeywordIdx(idx);
  });

  const keyword = HERO_KEYWORDS[keywordIdx];

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-blue/[0.04] via-transparent to-brand-amber/[0.03]"
        aria-hidden
      />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-6xl px-4 text-center"
        style={{ y: y2, opacity, scale }}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Badge variant="amber" className="mb-6 px-4 py-1.5 text-sm">
            UTB Te Acompaña · 2026
          </Badge>
        </motion.div>

        <motion.h1
          className="font-display text-5xl font-bold leading-tight md:text-7xl lg:text-8xl"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <span className="block text-foreground">Tu futuro,</span>
          <AnimatedGradientText as="span" className="block">
            nuestra misión
          </AnimatedGradientText>
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          Microservicio diseñado para prevenir la{' '}
          <span className="inline-block min-w-[10ch] text-center font-semibold text-brand-blue-mid">
            <AnimatePresence mode="wait">
              <motion.span
                key={keyword}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="inline-block"
              >
                {keyword}
              </motion.span>
            </AnimatePresence>
          </span>{' '}
          estudiantil a través de acompañamiento personalizado y análisis predictivo.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <ClayButton href="/register/student" size="lg">
            Comienza tu viaje <ArrowRight className="ml-2 h-4 w-4" />
          </ClayButton>
          <ClayButton href="/register/institutional" variant="outline" size="lg">
            Acceso institucional
          </ClayButton>
          <ClayButton href="/quienes-somos" variant="outline" size="lg">
            Conoce más
          </ClayButton>
        </motion.div>

        {!reduceMotion && (
          <motion.div
            className="mt-14 flex justify-center"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            <div className="flex h-10 w-6 justify-center rounded-full border-2 border-brand-blue/60">
              <div className="mt-2 h-3 w-1.5 animate-bounce rounded-full bg-brand-blue/80" />
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
