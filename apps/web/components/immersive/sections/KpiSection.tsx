'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { INSTITUTIONAL_KPIS } from '../data/landing-content';
import { ClayCard } from '../clay/ClayCard';
import { staggerContainer, staggerItem } from '../primitives/SectionReveal';
import { useMotionSafe } from '../hooks/useMotionSafe';

export function KpiSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.1 });
  const { reduceMotion } = useMotionSafe();

  return (
    <section ref={ref} className="bg-brand-bg/50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display mb-2 text-4xl font-bold text-brand-blue">KPIs institucionales</h2>
        <p className="mb-10 text-sm text-muted">* Vista previa con datos demo UTB</p>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={reduceMotion ? undefined : staggerContainer}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {INSTITUTIONAL_KPIS.map((k) => (
            <motion.div key={k.name} variants={reduceMotion ? undefined : staggerItem}>
              <ClayCard hover3d={false} className="min-w-0">
                <p className="text-sm text-muted">{k.name}</p>
                <p className="mt-2 text-3xl font-bold text-brand-blue">{k.value}</p>
                <p className="mt-1 text-sm text-green-600">{k.trend}</p>
              </ClayCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
