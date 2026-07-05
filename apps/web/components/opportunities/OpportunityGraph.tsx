'use client';

interface OpportunityGraphProps {
  opportunityTitle: string;
  area?: string;
}

export function OpportunityGraph({ opportunityTitle, area }: OpportunityGraphProps) {
  return (
    <div className="rounded-lg border border-brand-border p-6">
      <p className="text-sm font-medium mb-4">Relación perfil ↔ oportunidad</p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="rounded-full border-2 border-brand-amber px-4 py-2 text-sm font-medium">
          Tu perfil
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-0.5 w-6 bg-brand-amber/60" />
          ))}
        </div>
        <div className="rounded-full border-2 border-brand-blue px-4 py-2 text-sm font-medium text-center max-w-[160px]">
          {opportunityTitle.slice(0, 40)}{opportunityTitle.length > 40 ? '…' : ''}
        </div>
      </div>
      {area && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Conexión por área: <span className="text-brand-amber">{area}</span>
        </p>
      )}
    </div>
  );
}
