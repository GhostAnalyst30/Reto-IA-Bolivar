'use client';

import { ClayFormCard } from '@/components/immersive/clay/ClayFormCard';

export function AuthLoadingFallback() {
  return (
    <ClayFormCard className="text-center">
      <p className="text-sm text-muted">Cargando…</p>
    </ClayFormCard>
  );
}
