'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, AlertCircle, MinusCircle } from 'lucide-react';
import { useAuthTransition } from '@/contexts/AuthTransitionContext';
import type { AuthTransitionStepStatus } from '@/lib/auth-transition';
import { Button } from '@/components/ui';

function StepIcon({ status }: { status: AuthTransitionStepStatus }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  }
  if (status === 'active') {
    return <Loader2 className="h-5 w-5 animate-spin text-brand-amber" />;
  }
  if (status === 'error') {
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
  if (status === 'skipped') {
    return <MinusCircle className="h-5 w-5 text-zinc-500" />;
  }
  return <Circle className="h-5 w-5 text-zinc-600" />;
}

export function AuthProcessOverlay() {
  const { phase, steps, error, isActive, resetTransition } = useAuthTransition();

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="mx-4 w-full max-w-md rounded-xl border border-brand-border bg-brand-surface px-6 py-6 shadow-xl"
          >
            <h2 className="font-display text-lg font-semibold text-brand-blue">
              {phase === 'error' ? 'No se pudo completar el acceso' : 'Iniciando sesión'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {phase === 'error'
                ? 'Revisa el detalle e inténtalo de nuevo.'
                : 'Estamos preparando tu portal con los pasos del proceso real.'}
            </p>

            <ul className="mt-5 space-y-3">
              {steps.map((step) => (
                <li key={step.id} className="flex items-start gap-3">
                  <StepIcon status={step.status} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        step.status === 'active'
                          ? 'text-sm font-medium text-foreground'
                          : 'text-sm text-muted'
                      }
                    >
                      {step.label}
                    </p>
                    {step.error && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{step.error}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {error && phase === 'error' && (
              <p className="mt-4 rounded-md bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            {phase === 'error' && (
              <div className="mt-5 flex justify-end">
                <Button variant="secondary" onClick={resetTransition}>
                  Volver al formulario
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
