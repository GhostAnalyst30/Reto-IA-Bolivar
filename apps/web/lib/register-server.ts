import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl, sendConfirmationEmail, sendPasswordResetEmail, shouldSkipOutgoingEmail } from '@/lib/email';
import { API_URL } from '@/lib/api';

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

export async function createAuthUser(
  email: string,
  password: string,
  fullName: string
) {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: fullName },
  });

  if (data.user) {
    await ensurePublicUserProfile(admin, data.user.id, email, fullName);
    return data.user.id;
  }

  if (error?.message?.toLowerCase().includes('already')) {
    const existingId = await findUserIdByEmail(admin, email);
    if (existingId) {
      await ensurePublicUserProfile(admin, existingId, email, fullName);
      return existingId;
    }
  }

  throw new Error(error?.message || 'No se pudo crear el usuario');
}

async function ensurePublicUserProfile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  fullName: string
) {
  const { error } = await admin.from('users').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      status: 'pending',
      role: 'student',
    },
    { onConflict: 'id' }
  );
  if (error) {
    throw new Error(error.message || 'No se pudo crear el perfil de usuario');
  }
}

export async function callBackendRegister(
  path: '/register/student' | '/register/institutional',
  body: Record<string, unknown>
) {
  const key = process.env.INTERNAL_REGISTER_KEY;
  if (!key) throw new Error('INTERNAL_REGISTER_KEY no configurada');

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Register-Key': key,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.error || 'Error al registrar solicitud');
  }
  return data;
}

export async function sendConfirmLink(email: string, fullName: string) {
  if (shouldSkipOutgoingEmail(email)) {
    return { skipped: true };
  }

  const admin = createAdminClient();
  const redirectTo = `${getAppUrl()}/auth/callback?next=${encodeURIComponent('/pending-approval')}`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error || !data.properties?.action_link) {
    throw new Error(error?.message || 'No se pudo generar el enlace de confirmación');
  }

  await sendConfirmationEmail({
    to: email,
    fullName,
    confirmLink: data.properties.action_link,
  });
}

export async function sendPasswordResetLink(email: string, fullName: string) {
  if (shouldSkipOutgoingEmail(email)) {
    return { skipped: true };
  }

  const admin = createAdminClient();
  const redirectTo = `${getAppUrl()}/auth/callback?next=${encodeURIComponent('/reset-password')}`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (error || !data.properties?.action_link) {
    throw new Error(error?.message || 'No se pudo generar el enlace de recuperación');
  }

  await sendPasswordResetEmail({
    to: email,
    fullName,
    resetLink: data.properties.action_link,
  });
}
