'use client';

import { useEffect, useState } from 'react';
import { BentoGrid, BentoCell } from './BentoGrid';

const DEFAULT_MESSAGES = [
  'Cargando información…',
  'Preparando la plataforma…',
  'Obteniendo datos…',
];

const CONTEXT_MESSAGES: Record<string, string[]> = {
  student: ['Preparando tu tutor IA…', 'Cargando recursos de aprendizaje…', 'Sincronizando progreso…'],
  institutional: ['Cargando estadísticas…', 'Obteniendo información institucional…', 'Preparando analítica…'],
  auth: ['Verificando credenciales…', 'Preparando acceso…'],
};

interface PageLoaderProps {
  context?: keyof typeof CONTEXT_MESSAGES;
  messages?: string[];
}

export function PageLoader({ context, messages }: PageLoaderProps) {
  const pool = messages ?? (context ? CONTEXT_MESSAGES[context] : DEFAULT_MESSAGES) ?? DEFAULT_MESSAGES;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % pool.length), 2200);
    return () => clearInterval(t);
  }, [pool.length]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8">
      <p className="mb-6 text-sm text-zinc-500 animate-pulse">{pool[idx]}</p>
      <BentoGrid cols={3} className="w-full max-w-2xl">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <BentoCell key={i} animate={false} className="h-20 animate-pulse bg-brand-bg/50">
            <div className="h-full w-full rounded bg-brand-border/40" />
          </BentoCell>
        ))}
      </BentoGrid>
    </div>
  );
}
