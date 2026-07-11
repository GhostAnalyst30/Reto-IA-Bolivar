'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useRef, useState } from 'react';
import { PROBLEM_SOLUTION_SLIDES } from '../data/landing-content';
import { ClayCard } from '../clay/ClayCard';
import { ProgressDots } from '../primitives/ProgressDots';
import { useIsMobile } from '../hooks/useIsMobile';
import { useMotionSafe } from '../hooks/useMotionSafe';
import { cn } from '@/lib/utils';

export function ProblemSolutionSection() {
  const containerRef = useRef<HTMLElement>(null);
  const [slide, setSlide] = useState(0);
  const isMobile = useIsMobile();
  const { reduceMotion } = useMotionSafe();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduceMotion) return;
    setSlide(v < 0.33 ? 0 : v < 0.66 ? 1 : 2);
  });

  const current = PROBLEM_SOLUTION_SLIDES[slide];

  if (reduceMotion) {
    return (
      <section id="narrativa" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-display mb-16 text-center text-4xl font-bold text-brand-blue">
            De la fragmentación al insight
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {PROBLEM_SOLUTION_SLIDES.map((s) => (
              <ClayCard key={s.title} hover3d={false}>
                <h3 className="font-display text-xl font-semibold text-brand-blue">{s.title}</h3>
                <p className="mt-4 leading-relaxed text-muted">{s.desc}</p>
              </ClayCard>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="narrativa"
      ref={containerRef}
      className={cn('relative', isMobile ? 'h-[160vh]' : 'h-[220vh]')}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto w-full max-w-4xl px-6">
          <h2 className="font-display mb-8 text-center text-3xl font-bold text-brand-blue md:text-4xl">
            De la fragmentación al insight
          </h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <ClayCard className={cn('border-t-4 bg-gradient-to-br', current.accent, current.gradient)}>
                <h3 className="font-display text-2xl font-semibold text-brand-blue">{current.title}</h3>
                <p className="mt-6 text-lg leading-relaxed text-muted">{current.desc}</p>
              </ClayCard>
            </motion.div>
          </AnimatePresence>

          <ProgressDots current={slide} total={3} className="mt-10" />
        </div>
      </div>
    </section>
  );
}
