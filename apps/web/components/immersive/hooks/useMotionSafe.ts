'use client';

import { useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

export function useMotionSafe() {
  const reduceMotion = useReducedMotion();

  return useMemo(
    () => ({
      enabled: !reduceMotion,
      reduceMotion: !!reduceMotion,
      transition: reduceMotion
        ? { duration: 0 }
        : { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
      spring: reduceMotion
        ? { type: 'tween' as const, duration: 0 }
        : { type: 'spring' as const, stiffness: 100, damping: 15 },
    }),
    [reduceMotion]
  );
}
