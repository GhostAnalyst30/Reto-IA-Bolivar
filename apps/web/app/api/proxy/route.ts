import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { API_URL } from '@/lib/api';
import { isPathAllowed } from '@/lib/proxy-allowlist';

export const runtime = 'nodejs';

interface AuthContext {
  token?: string;
  role: string;
}

// In-memory role cache (persists per server instance). Avoids a Supabase DB
// round-trip on every proxied request; roles rarely change within a session.
const ROLE_TTL_MS = 60_000;
const roleCache = new Map<string, { role: string; expires: number }>();

async function getAuth(): Promise<AuthContext> {
  const supabase = await createClient();

  // getSession() reads the token from cookies locally (no network round-trip).
  // The FastAPI backend re-validates the JWT, so trusting it here for routing is safe.
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  const token = session?.access_token;
  if (!userId || !token) return { token: undefined, role: '' };

  const cached = roleCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return { token, role: cached.role };
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single();
  const role = profile?.role || '';
  roleCache.set(userId, { role, expires: Date.now() + ROLE_TTL_MS });
  return { token, role };
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function deny(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status });
}

async function authorize(path: string | null): Promise<
  { ok: true; token: string | undefined; path: string } | { ok: false; response: NextResponse }
> {
  if (!path) return { ok: false, response: NextResponse.json({ error: 'path required' }, { status: 400 }) };
  const { token, role } = await getAuth();
  if (!token) return { ok: false, response: deny('No autenticado', 401) };
  if (!isPathAllowed(path, role)) return { ok: false, response: deny('Ruta no permitida') };
  return { ok: true, token, path };
}

async function forward(method: string, path: string, token: string | undefined, body?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: body !== undefined
      ? { 'Content-Type': 'application/json', ...authHeaders(token) }
      : authHeaders(token),
    ...(body !== undefined ? { body } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request.nextUrl.searchParams.get('path'));
  if (!auth.ok) return auth.response;
  return forward('GET', auth.path, auth.token);
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request.nextUrl.searchParams.get('path'));
  if (!auth.ok) return auth.response;

  const body = await request.text();

  if (auth.path.includes('/messages')) {
    const res = await fetch(`${API_URL}${auth.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(auth.token) },
      body,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: 'Stream error' }));
      return NextResponse.json(data, { status: res.status });
    }
    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  return forward('POST', auth.path, auth.token, body);
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(request.nextUrl.searchParams.get('path'));
  if (!auth.ok) return auth.response;
  const body = await request.text();
  return forward('PATCH', auth.path, auth.token, body);
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(request.nextUrl.searchParams.get('path'));
  if (!auth.ok) return auth.response;
  return forward('DELETE', auth.path, auth.token);
}
