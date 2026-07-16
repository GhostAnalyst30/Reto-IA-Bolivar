import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-3xl font-bold">Página no encontrada</h1>
      <p className="text-muted max-w-md">
        La ruta que busca no existe. Use los portales con prefijo de rol:
        plataforma, institucional o estudiante.
      </p>
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <Link href="/platform/dashboard" className="text-[var(--portal-accent)] hover:underline">
          Dashboard plataforma
        </Link>
        <Link href="/institutional/dashboard" className="text-[var(--portal-accent)] hover:underline">
          Dashboard institucional
        </Link>
        <Link href="/student/twin/summary" className="text-[var(--portal-accent)] hover:underline">
          Portal estudiante
        </Link>
        <Link href="/login" className="text-[var(--portal-accent)] hover:underline">
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
