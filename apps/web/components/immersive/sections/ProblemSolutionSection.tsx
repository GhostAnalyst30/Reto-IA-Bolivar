'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { PROBLEM_SOLUTION_SLIDES } from '../data/landing-content';
import { ClayCard } from '../clay/ClayCard';
import { SectionReveal, staggerContainer, staggerItem } from '../primitives/SectionReveal';
import { useMotionSafe } from '../hooks/useMotionSafe';
import { cn } from '@/lib/utils';

export function ProblemSolutionSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(gridRef, { once: false, amount: 0.2, margin: '-50px' });
  const { reduceMotion } = useMotionSafe();

  return (
    <section id="narrativa" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionReveal>
          <h2 className="font-display mb-16 text-center text-3xl font-bold text-brand-blue md:text-4xl">
            De la fragmentación al insight
          </h2>
        </SectionReveal>

        <motion.div
          ref={gridRef}
          className="grid gap-8 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate={reduceMotion || isInView ? 'visible' : 'hidden'}
        >
          {PROBLEM_SOLUTION_SLIDES.map((s) => (
            <motion.div key={s.title} variants={reduceMotion ? undefined : staggerItem}>
              <ClayCard
                hover3d={!reduceMotion}
                className={cn('border-t-4 bg-gradient-to-br h-full', s.accent, s.gradient)}
              >
                <h3 className="font-display text-xl font-semibold text-brand-blue">{s.title}</h3>
                <p className="mt-4 leading-relaxed text-muted">{s.desc}</p>
              </ClayCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
