import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailAppUrl, sendConfirmationEmail, sendPasswordResetEmail, shouldSkipOutgoingEmail } from '@/lib/email';
import { API_URL } from '@/lib/api';

const BACKEND_REGISTER_TIMEOUT_MS = 10_000;

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

export async function createAuthUser(
  email: string,
  password: string,
  fullName: string,
  options?: { pendingRole?: string }
) {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: fullName },
  });

  if (data.user) {
    await ensurePublicUserProfile(admin, data.user.id, email, fullName, options?.pendingRole);
    return data.user.id;
  }

  if (error?.message?.toLowerCase().includes('already')) {
    const existingId = await findUserIdByEmail(admin, email);
    if (existingId) {
      await ensurePublicUserProfile(admin, existingId, email, fullName, options?.pendingRole);
      return existingId;
    }
  }

  throw new Error(error?.message || 'No se pudo crear el usuario');
}

async function ensurePublicUserProfile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  fullName: string,
  pendingRole = 'student'
) {
  const { data: existing } = await admin
    .from('users')
    .select('status, role')
    .eq('id', userId)
    .maybeSingle();

  if (existing?.status === 'approved') {
    const { error } = await admin.from('users').update({
      email,
      full_name: fullName,
    }).eq('id', userId);
    if (error) {
      throw new Error(error.message || 'No se pudo actualizar el perfil de usuario');
    }
    return;
  }

  const { error } = await admin.from('users').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      status: 'pending',
      role: pendingRole,
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_REGISTER_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Register-Key': key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Clave interna de registro inválida. Verifica INTERNAL_REGISTER_KEY en web y API.');
      }
      if (res.status === 503) {
        throw new Error('El servidor no está disponible o la institución UTB no está configurada. ¿Está corriendo la API?');
      }
      throw new Error(data.detail || data.error || 'Error al registrar solicitud');
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('El servidor de registro no respondió a tiempo. Verifica que la API esté corriendo (pnpm dev:api).');
    }
    if (err instanceof TypeError) {
      throw new Error('No se pudo conectar con la API de registro. Verifica API_URL y que la API esté corriendo.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function buildConfirmPageLink(params: {
  tokenHash: string;
  type: 'magiclink' | 'recovery';
  next: string;
}) {
  const url = new URL('/auth/confirm', getEmailAppUrl());
  url.searchParams.set('token_hash', params.tokenHash);
  url.searchParams.set('type', params.type);
  url.searchParams.set('next', params.next);
  return url.toString();
}

export async function sendConfirmLink(email: string, fullName: string) {
  if (shouldSkipOutgoingEmail(email)) {
    return { skipped: true };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  const tokenHash = data.properties?.hashed_token;
  if (error || !tokenHash) {
    throw new Error(error?.message || 'No se pudo generar el enlace de confirmación');
  }

  await sendConfirmationEmail({
    to: email,
    fullName,
    confirmLink: buildConfirmPageLink({
      tokenHash,
      type: 'magiclink',
      next: '/pending-approval',
    }),
  });
}

export async function sendPasswordResetLink(email: string, fullName: string) {
  if (shouldSkipOutgoingEmail(email)) {
    return { skipped: true };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  const tokenHash = data.properties?.hashed_token;
  if (error || !tokenHash) {
    throw new Error(error?.message || 'No se pudo generar el enlace de recuperación');
  }

  await sendPasswordResetEmail({
    to: email,
    fullName,
    resetLink: buildConfirmPageLink({
      tokenHash,
      type: 'recovery',
      next: '/reset-password',
    }),
  });
}
