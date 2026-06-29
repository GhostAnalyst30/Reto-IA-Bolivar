'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, Badge } from '@/components/ui';
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg text-center">
        {isRejected ? (
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
        ) : (
          <Clock className="mx-auto h-12 w-12 text-brand-amber" />
        )}
        <h1 className="mt-4 text-2xl font-semibold">
          {isRejected ? 'Solicitud denegada' : 'Solicitud en revisión'}
        </h1>
        <Badge variant={isRejected ? 'red' : 'amber'} className="mt-3">
          {profile?.status || 'pending'}
        </Badge>
        {request && (
          <p className="mt-4 text-zinc-400">
            Rol solicitado: <strong>{ROLE_LABELS[request.requested_role] || request.requested_role}</strong>
          </p>
        )}
        {isRejected && request?.rejection_reason && (
          <p className="mt-4 rounded-lg bg-red-900/20 p-4 text-sm text-red-200">
            Motivo: {request.rejection_reason}
          </p>
        )}
        {!isRejected && (
          <p className="mt-4 text-zinc-400">
            Un administrador revisará tu solicitud. Recibirás acceso al portal una vez aprobada.
          </p>
        )}
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="ghost" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</Button>
          <Button href="/" variant="secondary">Volver al inicio</Button>
        </div>
      </Card>
    </div>
  );
}
