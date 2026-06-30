import { API_URL } from '@/lib/api';

const INTERNAL_KEY = process.env.INTERNAL_REGISTER_KEY || '';

export async function callRegisterApi(
  path: '/register/student' | '/register/institutional',
  body: Record<string, unknown>,
  token: string | null
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (INTERNAL_KEY) {
    headers['X-Internal-Register-Key'] = INTERNAL_KEY;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
