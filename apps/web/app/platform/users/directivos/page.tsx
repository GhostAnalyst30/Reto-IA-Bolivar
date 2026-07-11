'use client';

import Link from 'next/link';
import { UsersAccordionPanel } from '@/components/admin/UsersAccordionPanel';

export default function PlatformDirectivosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Directivos UTB</h1>
          <p className="text-muted">Filtra por nombre o rol institucional</p>
        </div>
        <Link href="/platform/users/create" className="text-sm text-[var(--portal-accent)] hover:underline">
          + Crear directivo
        </Link>
      </div>
      <UsersAccordionPanel directivoOnly />
    </div>
  );
}
