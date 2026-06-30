'use client';

import { useEffect, useState } from 'react';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';
import { proxyJson } from '@/lib/proxy';

interface Prediction {
  retention_forecast: number;
  dropout_risk_percent: number;
  confidence: string;
  factors: string[];
}

export default function PredictionPage() {
  const [pred, setPred] = useState<Prediction | null>(null);

  useEffect(() => {
    proxyJson<Prediction>('/institutional/prediction')
      .then(setPred)
      .catch(() => setPred(null));
  }, []);

  if (!pred) return <p className="text-zinc-500">Calculando predicción…</p>;

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <h1 className="font-display mb-6 text-2xl font-bold">Predicción de retención</h1>
      <BentoGrid cols={3}>
        <BentoCell>
          <p className="text-sm text-zinc-500">Retención proyectada</p>
          <p className="mt-2 text-4xl font-bold text-brand-amber">{pred.retention_forecast}%</p>
        </BentoCell>
        <BentoCell>
          <p className="text-sm text-zinc-500">Riesgo deserción</p>
          <p className="mt-2 text-4xl font-bold text-red-400">{pred.dropout_risk_percent}%</p>
        </BentoCell>
        <BentoCell>
          <p className="text-sm text-zinc-500">Confianza del modelo</p>
          <p className="mt-2 text-2xl font-semibold capitalize">{pred.confidence}</p>
        </BentoCell>
        <BentoCell colSpan={3}>
          <p className="font-medium mb-3">Factores considerados</p>
          <ul className="space-y-2 text-zinc-500">
            {pred.factors.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </BentoCell>
      </BentoGrid>
    </div>
  );
}
