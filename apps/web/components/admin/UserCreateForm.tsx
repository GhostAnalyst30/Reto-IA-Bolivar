'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Select } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { ROLE_LABELS } from '@/lib/utils';

const STUDENT_ROLES = [{ value: 'student', label: 'Estudiante' }];
const STAFF_ROLES = [
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'psychologist', label: ROLE_LABELS.psychologist },
];

interface UserCreateFormProps {
  allowedRoles?: 'student' | 'directivo' | 'all';
  redirectTo?: string;
}

export function UserCreateForm({ allowedRoles = 'all', redirectTo }: UserCreateFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(allowedRoles === 'directivo' ? 'admin' : 'student');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [programs, setPrograms] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    proxyJson<{ name: string }[]>('/admin/programs')
      .then((data) => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => setPrograms([]));
  }, []);

  const roleOptions =
    allowedRoles === 'student' ? STUDENT_ROLES
    : allowedRoles === 'directivo' ? STAFF_ROLES
    : [...STUDENT_ROLES, ...STAFF_ROLES];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const body: Record<string, unknown> = { email, password, full_name: fullName, role };
      if (role === 'student') {
        if (program) body.program = program;
        if (semester) body.semester = parseInt(semester, 10);
        if (birthDate) body.birth_date = birthDate;
      }
      await proxyJson('/institutional/users', { method: 'POST', body: JSON.stringify(body) });
      setSuccess('Usuario creado y aprobado. Se envió email de bienvenida.');
      if (redirectTo) setTimeout(() => router.push(redirectTo), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalCard>
      <form onSubmit={submit} className="space-y-4 max-w-lg">
        <div>
          <Label>Nombre completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <Label>Correo UTB (@utb.edu.co)</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label>Contraseña (mín. 8 caracteres)</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        <div>
          <Label>Rol</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </div>
        {role === 'student' && (
          <>
            <div>
              <Label>Programa académico</Label>
              <Select value={program} onChange={(e) => setProgram(e.target.value)}>
                <option value="">Seleccionar...</option>
                {programs.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Semestre</Label>
                <Input type="number" min={1} max={12} value={semester} onChange={(e) => setSemester(e.target.value)} />
              </div>
              <div>
                <Label>Fecha nacimiento</Label>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
            </div>
          </>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear usuario'}</Button>
      </form>
    </PortalCard>
  );
}
