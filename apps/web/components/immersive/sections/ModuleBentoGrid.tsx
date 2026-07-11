'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { MODULES } from '../data/landing-content';
import { ClayCard } from '../clay/ClayCard';
import { staggerContainer, staggerItem } from '../primitives/SectionReveal';
import { useMotionSafe } from '../hooks/useMotionSafe';
import { cn } from '@/lib/utils';

export function ModuleBentoGrid() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.1 });
  const { reduceMotion } = useMotionSafe();

  return (
    <section id="modulos" ref={ref} className="bg-brand-bg/50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display mb-4 text-4xl font-bold text-brand-blue">Módulos de la plataforma</h2>
        <p className="mb-12 max-w-2xl text-muted">
          Siete capacidades integradas en un ecosistema institucional UTB.
        </p>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={reduceMotion ? undefined : staggerContainer}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {MODULES.map((m, i) => (
            <motion.div
              key={m.id}
              variants={reduceMotion ? undefined : staggerItem}
              className={cn(i === 0 && 'lg:col-span-2')}
            >
              <ClayCard>
                <h3 className="font-semibold text-brand-blue">{m.name}</h3>
                <p className="mt-2 text-sm text-muted">{m.desc}</p>
              </ClayCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
