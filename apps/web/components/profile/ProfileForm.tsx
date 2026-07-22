'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { proxyJson } from '@/lib/proxy';

interface ProfileData {
  email: string;
  full_name: string;
  role: string;
  institution?: { name: string } | null;
  student_profile?: {
    student_id?: string;
    program?: string;
    semester?: number;
    contact_preference?: string;
    twin_consent?: boolean;
  } | null;
}

interface ProfileFormProps {
  title: string;
  subtitle?: string;
}

export function ProfileForm({ title, subtitle }: ProfileFormProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [contactPref, setContactPref] = useState('email');
  const [twinConsent, setTwinConsent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isStudent = profile?.role === 'student';

  useEffect(() => {
    proxyJson<ProfileData>('/profile')
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name || '');
        const sp = data.student_profile;
        if (sp) {
          setStudentId(sp.student_id || '');
          setProgram(sp.program || '');
          setSemester(sp.semester?.toString() || '');
          setContactPref(sp.contact_preference || 'email');
          setTwinConsent(sp.twin_consent || false);
        }
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
    } catch { /* non-blocking */ }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const body: Record<string, unknown> = { full_name: fullName };
      if (isStudent) {
        body.student_id = studentId;
        body.program = program;
        body.semester = semester ? parseInt(semester, 10) : null;
        body.contact_preference = contactPref;
        body.twin_consent = twinConsent;
      }
      await proxyJson('/profile', { method: 'PATCH', body: JSON.stringify(body) });
      setMessage('Perfil actualizado.');
      await notifyChange('profile_changed', [`Nombre: ${fullName}`]);
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
          {isStudent && (
            <>
              <div>
                <Label htmlFor="studentId">Código estudiantil</Label>
                <Input id="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="program">Programa / Carrera</Label>
                <Input id="program" value={program} onChange={(e) => setProgram(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="semester">Semestre</Label>
                <Input id="semester" type="number" min={1} max={12} value={semester} onChange={(e) => setSemester(e.target.value)} />
              </div>
              <div>
                <Label>Preferencia de contacto</Label>
                <Select value={contactPref} onChange={(e) => setContactPref(e.target.value)}>
                  <option value="email">Correo</option>
                  <option value="phone">Teléfono</option>
                  <option value="both">Ambos</option>
                </Select>
              </div>
              <div className="space-y-2">
                <PrivacyBanner message="Al activar el consentimiento, el personal UTB autorizado podrá ver un resumen de tu Digital Twin para brindarte mejor acompañamiento." />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={twinConsent}
                    onChange={(e) => setTwinConsent(e.target.checked)}
                    className="rounded border-brand-border"
                  />
                  Compartir resumen Digital Twin con personal UTB
                </label>
              </div>
            </>
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
    </div>
  );
}
