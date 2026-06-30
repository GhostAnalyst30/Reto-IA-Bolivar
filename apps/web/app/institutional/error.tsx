'use client';

import { Button } from '@/components/ui';

export default function InstitutionalError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <h2 className="text-xl font-semibold">Error en el portal institucional</h2>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
