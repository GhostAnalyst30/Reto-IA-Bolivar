'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Label } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { proxyJson } from '@/lib/proxy';
import { getWeeklyReportEmail } from '@/lib/app-config';

interface ProfileData {
  email: string;
  full_name: string;
  role: string;
  institution?: { name: string } | null;
}

interface ProfileFormProps {
  title: string;
  subtitle?: string;
  showReportInfo?: boolean;
}

export function ProfileForm({ title, subtitle, showReportInfo }: ProfileFormProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    proxyJson<ProfileData>('/profile')
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name || '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  async function notifyChange(type: 'profile_changed' | 'password_changed', changes?: string[]) {
    try {
      await fetch('/api/profile/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, changes }),
      });
    } catch {
      /* non-blocking */
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const prev = profile?.full_name;
      const res = await proxyJson<{ full_name: string; notify?: string }>('/profile', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName }),
      });
      setMessage('Perfil actualizado.');
      if (res.notify && prev !== res.full_name) {
        await notifyChange('profile_changed', [`Nombre: ${res.full_name}`]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setActionLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await proxyJson<{ notify?: string }>('/profile/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setMessage('Contraseña actualizada.');
      setCurrentPassword('');
      setNewPassword('');
      if (res.notify) await notifyChange('password_changed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar contraseña');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="text-zinc-500">Cargando perfil...</p>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ActionOverlay show={actionLoading} message="Guardando cambios..." />
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}

      <Card>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <Label>Correo</Label>
            <Input value={profile?.email || ''} readOnly className="opacity-70" />
          </div>
          <div>
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          {profile?.institution && (
            <div>
              <Label>Institución</Label>
              <Input value={profile.institution.name} readOnly className="opacity-70" />
            </div>
          )}
          <Button type="submit" disabled={actionLoading}>Guardar perfil</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold">Cambiar contraseña</h3>
        <form onSubmit={changePassword} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="current">Contraseña actual</Label>
            <PasswordInput id="current" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="newpass">Nueva contraseña</Label>
            <PasswordInput id="newpass" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </div>
          <Button type="submit" variant="secondary" disabled={actionLoading}>Actualizar contraseña</Button>
        </form>
      </Card>

      {showReportInfo && (
        <Card>
          <h3 className="font-semibold">Resumen ejecutivo por correo</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Los reportes diarios se envían a <strong>{getWeeklyReportEmail()}</strong>.
            Puedes solicitar un envío manual desde el dashboard o configurar el cron semanal.
          </p>
        </Card>
      )}
    </div>
  );
}
