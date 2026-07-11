'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useMotionSafe } from '../hooks/useMotionSafe';

interface FloatingParticleProps {
  size: number;
  left: number;
  top: number;
  speed: number;
  delay: number;
}

export function FloatingParticle({ size, left, top, speed, delay }: FloatingParticleProps) {
  const { scrollYProgress } = useScroll();
  const { reduceMotion } = useMotionSafe();

  const y = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -100 * speed]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 180 * speed]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, reduceMotion ? 1 : 1.2, 1]);

  return (
    <motion.div
      className="absolute rounded-full clay-particle gpu-layer pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${left}%`,
        top: `${top}%`,
        y,
        rotate,
        scale,
        background: 'radial-gradient(circle at 30% 30%, var(--utb-blue-light), var(--utb-blue))',
        filter: 'blur(1px)',
        opacity: 0.55,
      }}
      animate={
        reduceMotion
          ? undefined
          : {
              y: [0, -16, 0],
              transition: {
                duration: 3 + delay,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
              },
            }
      }
      aria-hidden
    />
  );
}
