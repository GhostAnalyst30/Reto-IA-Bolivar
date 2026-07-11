'use client';

import { KPI_DATA } from '../data/landing-content';
import { ClayCard } from './ClayCard';
import { cn } from '@/lib/utils';

export function KpiCardClay() {
  return (
    <ClayCard hover3d={false} className="w-full">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {KPI_DATA.map((kpi) => (
          <div key={kpi.label} className="rounded-[var(--public-radius-sm)] border border-brand-border bg-brand-bg/80 p-4 text-center">
            <p className="text-xs text-muted">{kpi.label}</p>
            <p className={cn('mt-1 text-2xl font-semibold', kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted">* Datos demo — KPIs institucionales UTB</p>
    </ClayCard>
  );
}
