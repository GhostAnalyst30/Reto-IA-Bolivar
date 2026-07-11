'use client';

import { PARTICLE_SEEDS } from '../data/landing-content';
import { DynamicGradient } from './DynamicGradient';
import { FloatingParticle } from './FloatingParticle';
import { useIsMobile } from '../hooks/useIsMobile';
import { useMotionSafe } from '../hooks/useMotionSafe';

type Intensity = 'full' | 'subtle' | 'minimal';

const PARTICLE_LIMITS: Record<Intensity, { desktop: number; mobile: number }> = {
  full: { desktop: 12, mobile: 6 },
  subtle: { desktop: 8, mobile: 4 },
  minimal: { desktop: 4, mobile: 2 },
};

interface AmbientBackgroundProps {
  intensity?: Intensity;
}

export function AmbientBackground({ intensity = 'subtle' }: AmbientBackgroundProps) {
  const isMobile = useIsMobile();
  const { reduceMotion } = useMotionSafe();
  const limit = isMobile ? PARTICLE_LIMITS[intensity].mobile : PARTICLE_LIMITS[intensity].desktop;
  const particles = PARTICLE_SEEDS.slice(0, limit);

  if (reduceMotion) {
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-brand-blue/5 via-transparent to-brand-amber/5" aria-hidden />
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <DynamicGradient variant="mixed" />
      {particles.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}
    </div>
  );
}
