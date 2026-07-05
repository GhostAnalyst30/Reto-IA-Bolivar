import { shouldSkipOutgoingEmail } from '@/lib/app-config';
import { sendPasswordResetLink } from '@/lib/register-server';
import { createAdminClient } from '@/lib/supabase/admin';

const rateLimit = new Map<string, number>();

async function findUserByUsername(username: string) {
  const admin = createAdminClient();
  const normalized = username.trim().toLowerCase();
  const { data, error } = await admin
    .from('users')
    .select('email, full_name')
    .eq('username', normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    if (!username || typeof username !== 'string') {
      return Response.json({ error: 'Usuario requerido' }, { status: 400 });
    }

    const profile = await findUserByUsername(username);
    if (!profile?.email) {
      return Response.json({ sent: true });
    }

    if (shouldSkipOutgoingEmail(profile.email)) {
      return Response.json({ sent: true, skipped: true });
    }

    const now = Date.now();
    const last = rateLimit.get(profile.email) || 0;
    if (now - last < 60_000) {
      return Response.json({ error: 'Espere antes de reenviar' }, { status: 429 });
    }
    rateLimit.set(profile.email, now);

    await sendPasswordResetLink(profile.email, profile.full_name || profile.email.split('@')[0]);

    return Response.json({ sent: true });
  } catch {
    return Response.json({ error: 'Error al enviar correo' }, { status: 500 });
  }
}
