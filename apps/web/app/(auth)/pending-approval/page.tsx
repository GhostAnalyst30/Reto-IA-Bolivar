'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Badge } from '@/components/ui';
import { ClayFormCard } from '@/components/immersive/clay/ClayFormCard';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { ROLE_LABELS } from '@/lib/utils';
import { Clock, XCircle, LogOut } from 'lucide-react';

export default function PendingApprovalPage() {
  const [profile, setProfile] = useState<{ status: string; role: string } | null>(null);
  const [request, setRequest] = useState<{ rejection_reason?: string; requested_role: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from('users').select('status, role').eq('id', user.id).single();
      setProfile(p);
      const { data: r } = await supabase.from('registration_requests').select('*').eq('user_id', user.id).single();
      setRequest(r);
    }
    load();
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const isRejected = profile?.status === 'rejected';

  return (
    <ClayFormCard className="max-w-lg text-center">
        <Link href="/" className="mx-auto mb-6 inline-block" aria-label="Inicio">
          <UtbLogo />
        </Link>
        {isRejected ? (
          <XCircle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
        ) : (
          <Clock className="mx-auto h-12 w-12 text-brand-amber" />
        )}
        <h1 className="font-display mt-4 text-2xl font-semibold text-brand-blue">
          {isRejected ? 'Solicitud denegada' : 'Solicitud en revisión'}
        </h1>
        <Badge variant={isRejected ? 'red' : 'amber'} className="mt-3">
          {profile?.status || 'pending'}
        </Badge>
        {request && (
          <p className="mt-4 text-muted">
            Rol solicitado: <strong className="text-foreground">{ROLE_LABELS[request.requested_role] || request.requested_role}</strong>
          </p>
        )}
        {isRejected && request?.rejection_reason && (
          <p className="mt-4 rounded-[var(--public-radius-md)] bg-red-600/10 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            Motivo: {request.rejection_reason}
          </p>
        )}
        {!isRejected && (
          <p className="mt-4 text-muted">
            Un administrador revisará tu solicitud. Recibirás acceso al portal una vez aprobada.
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button variant="ghost" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</Button>
          {isRejected && (
            <Button href="/register/student" variant="secondary">Volver a registrarse</Button>
          )}
          <Button href="/" variant="secondary">Volver al inicio</Button>
        </div>
    </ClayFormCard>
  );
}
