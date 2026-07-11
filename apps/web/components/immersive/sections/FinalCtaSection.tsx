'use client';

import { SectionReveal } from '../primitives/SectionReveal';
import { ClayButton } from '../clay/ClayButton';
import { DynamicGradient } from '../primitives/DynamicGradient';

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden py-24 text-white">
      <DynamicGradient variant="blue" className="opacity-80 dark:opacity-70" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <SectionReveal>
          <h2 className="font-display text-4xl font-bold">Comienza hoy</h2>
          <p className="mt-4 text-white/80">
            Regístrate con tu correo @utb.edu.co y accede tras aprobación del administrador.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <ClayButton href="/register/student" size="lg">
              Registro estudiante
            </ClayButton>
            <ClayButton href="/register/institutional" variant="light" size="lg">
              Registro institucional
            </ClayButton>
            <ClayButton href="/login" variant="light" size="lg">
              Ya tengo cuenta
            </ClayButton>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
