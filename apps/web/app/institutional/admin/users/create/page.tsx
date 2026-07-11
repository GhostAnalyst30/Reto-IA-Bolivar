'use client';

import { UserCreateForm } from '@/components/admin/UserCreateForm';

export default function AdminCreateUserPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Crear usuario</h1>
        <p className="text-muted">Acceso inmediato tras la creación (sin aprobación pendiente)</p>
      </div>
      <UserCreateForm allowedRoles="all" redirectTo="/institutional/admin/users/students" />
    </div>
  );
}
