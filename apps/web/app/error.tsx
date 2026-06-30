'use client';

import { Button } from '@/components/ui';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-display text-2xl font-bold">Algo salió mal</h1>
      <p className="text-zinc-500">Lo sentimos, ocurrió un error inesperado.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
