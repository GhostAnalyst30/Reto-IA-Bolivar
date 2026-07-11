'use client';

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useMotionSafe } from '../hooks/useMotionSafe';

export function StoryProgressBar() {
  const { scrollYProgress } = useScroll();
  const { reduceMotion } = useMotionSafe();
  const scaleY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1]), {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (reduceMotion) return null;

  return (
    <>
      <motion.div
        className="fixed right-0 top-0 z-[55] hidden h-full w-1 origin-top bg-brand-border/60 dark:bg-brand-border md:block"
        aria-hidden
      >
        <motion.div
          className="h-full w-full origin-top bg-gradient-to-b from-brand-blue via-brand-blue-mid to-brand-amber"
          style={{ scaleY }}
        />
      </motion.div>
      <motion.div
        role="progressbar"
        aria-label="Progreso de la página"
        aria-valuemin={0}
        aria-valuemax={100}
        className="fixed left-0 top-16 z-[55] h-0.5 w-full origin-left bg-brand-border/60 dark:bg-brand-border md:hidden"
      >
        <motion.div
          className="h-full w-full origin-left bg-gradient-to-r from-brand-blue to-brand-amber"
          style={{ scaleX: scaleY }}
        />
      </motion.div>
    </>
  );
}
