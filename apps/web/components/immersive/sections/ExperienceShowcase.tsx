'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ClayCard } from '../clay/ClayCard';
import { ClayButton } from '../clay/ClayButton';
import { staggerContainer, staggerItem } from '../primitives/SectionReveal';
import { useMotionSafe } from '../hooks/useMotionSafe';

export function ExperienceShowcase() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.15 });
  const { reduceMotion } = useMotionSafe();

  return (
    <section id="experiencias" ref={ref} className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display mb-12 text-center text-4xl font-bold text-brand-blue">
          Dos experiencias, una plataforma
        </h2>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={reduceMotion ? undefined : staggerContainer}
          className="grid gap-8 lg:grid-cols-2"
        >
          <motion.div variants={reduceMotion ? undefined : staggerItem}>
            <ClayCard className="border-brand-amber/40 h-full">
              <h3 className="text-xl font-semibold text-brand-amber">Estudiantes</h3>
              <ul className="mt-4 space-y-2 text-muted">
                <li>• Chat tutor IA con historial persistente</li>
                <li>• Rutas de aprendizaje personalizadas</li>
                <li>• Buscador y tutor RAG contextual</li>
                <li>• Progreso y biblioteca de recursos</li>
              </ul>
              <ClayButton href="/register/student" size="sm" className="mt-6">
                Registrarse como estudiante
              </ClayButton>
            </ClayCard>
          </motion.div>

          <motion.div variants={reduceMotion ? undefined : staggerItem}>
            <ClayCard className="h-full border-brand-blue/30">
              <h3 className="text-xl font-semibold text-brand-blue">Directivos</h3>
              <ul className="mt-4 space-y-2 text-muted">
                <li>• 5 módulos analíticos con scope por rol</li>
                <li>• Director de IA con insights ejecutivos</li>
                <li>• Panel admin: solicitudes y auth-keys</li>
                <li>• Seguridad OWASP con alertas en tiempo real</li>
              </ul>
              <ClayButton href="/register/institutional" variant="outline" size="sm" className="mt-6">
                Registro institucional
              </ClayButton>
            </ClayCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
