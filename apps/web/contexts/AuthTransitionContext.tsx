'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createInitialSteps,
  type AuthTransitionPhase,
  type AuthTransitionStep,
  type AuthTransitionStepId,
} from '@/lib/auth-transition';

interface AuthTransitionContextValue {
  phase: AuthTransitionPhase;
  steps: AuthTransitionStep[];
  error: string | null;
  isActive: boolean;
  startTransition: () => void;
  setStepActive: (id: AuthTransitionStepId) => void;
  completeStep: (id: AuthTransitionStepId) => void;
  skipStep: (id: AuthTransitionStepId) => void;
  failStep: (id: AuthTransitionStepId, message: string) => void;
  finishTransition: () => void;
  resetTransition: () => void;
}

const AuthTransitionContext = createContext<AuthTransitionContextValue | null>(null);

function updateStep(
  steps: AuthTransitionStep[],
  id: AuthTransitionStepId,
  patch: Partial<AuthTransitionStep>
): AuthTransitionStep[] {
  return steps.map((step) => (step.id === id ? { ...step, ...patch } : step));
}

export function AuthTransitionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthTransitionPhase>('idle');
  const [steps, setSteps] = useState<AuthTransitionStep[]>(createInitialSteps);
  const [error, setError] = useState<string | null>(null);

  const startTransition = useCallback(() => {
    setSteps(createInitialSteps());
    setError(null);
    setPhase('running');
  }, []);

  const setStepActive = useCallback((id: AuthTransitionStepId) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id === id) return { ...step, status: 'active', error: undefined };
        if (step.status === 'active') return { ...step, status: 'pending' };
        return step;
      })
    );
  }, []);

  const completeStep = useCallback((id: AuthTransitionStepId) => {
    setSteps((prev) => updateStep(prev, id, { status: 'done', error: undefined }));
  }, []);

  const skipStep = useCallback((id: AuthTransitionStepId) => {
    setSteps((prev) => updateStep(prev, id, { status: 'skipped', error: undefined }));
  }, []);

  const failStep = useCallback((id: AuthTransitionStepId, message: string) => {
    setSteps((prev) => updateStep(prev, id, { status: 'error', error: message }));
    setError(message);
    setPhase('error');
  }, []);

  const finishTransition = useCallback(() => {
    setPhase((current) => {
      if (current !== 'running') return current;
      window.setTimeout(() => {
        setPhase('idle');
        setSteps(createInitialSteps());
        setError(null);
      }, 300);
      return 'done';
    });
    setSteps((prev) => {
      const portalStep = prev.find((step) => step.id === 'portal');
      if (!portalStep || portalStep.status !== 'active') return prev;
      return prev.map((step) =>
        step.id === 'portal' ? { ...step, status: 'done', error: undefined } : step
      );
    });
  }, []);

  const resetTransition = useCallback(() => {
    setPhase('idle');
    setSteps(createInitialSteps());
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      phase,
      steps,
      error,
      isActive: phase === 'running' || phase === 'error',
      startTransition,
      setStepActive,
      completeStep,
      skipStep,
      failStep,
      finishTransition,
      resetTransition,
    }),
    [
      phase,
      steps,
      error,
      startTransition,
      setStepActive,
      completeStep,
      skipStep,
      failStep,
      finishTransition,
      resetTransition,
    ]
  );

  return (
    <AuthTransitionContext.Provider value={value}>{children}</AuthTransitionContext.Provider>
  );
}

export function useAuthTransition() {
  const context = useContext(AuthTransitionContext);
  if (!context) {
    throw new Error('useAuthTransition must be used within AuthTransitionProvider');
  }
  return context;
}
