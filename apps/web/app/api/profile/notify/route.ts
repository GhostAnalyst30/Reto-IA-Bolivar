import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPasswordChangeEmail, sendProfileChangeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('email, full_name').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const type = body.type as string;
  const changes = body.changes as string[] | undefined;

  try {
    if (type === 'password_changed') {
      await sendPasswordChangeEmail({ to: profile.email, fullName: profile.full_name || profile.email });
    } else if (type === 'profile_changed') {
      await sendProfileChangeEmail({
        to: profile.email,
        fullName: profile.full_name || profile.email,
        changes: changes || ['Datos de perfil actualizados'],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
