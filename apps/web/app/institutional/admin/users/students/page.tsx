'use client';

import Link from 'next/link';
import { UsersAccordionPanel } from '@/components/admin/UsersAccordionPanel';

export default function AdminStudentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Estudiantes</h1>
          <p className="text-muted">Gestión de estudiantes UTB</p>
        </div>
        <Link href="/institutional/admin/users/create" className="text-sm text-[var(--portal-accent)] hover:underline">
          + Crear estudiante
        </Link>
      </div>
      <UsersAccordionPanel studentOnly />
    </div>
  );
}
