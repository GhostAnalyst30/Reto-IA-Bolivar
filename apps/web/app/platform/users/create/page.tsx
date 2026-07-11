'use client';

import { UserCreateForm } from '@/components/admin/UserCreateForm';

export default function PlatformCreateUserPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Crear usuario</h1>
        <p className="text-muted">El usuario queda aprobado automáticamente y recibe email de bienvenida</p>
      </div>
      <UserCreateForm allowedRoles="all" redirectTo="/platform/users/students" />
    </div>
  );
}
