import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { API_URL } from '@/lib/api';

async function getAuthHeaderFromCookies() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function buildRegisterHeaders(request: NextRequest) {
  const incoming = request.headers.get('Authorization');
  if (incoming?.startsWith('Bearer ')) {
    return { Authorization: incoming };
  }
  const cookieAuth = await getAuthHeaderFromCookies();
  if ('Authorization' in cookieAuth) return cookieAuth;
  const key = process.env.INTERNAL_REGISTER_KEY;
  if (key) return { 'X-Internal-Register-Key': key };
  return {};
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const authHeader = await buildRegisterHeaders(request);
  const res = await fetch(`${API_URL}/register/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: 'Error de servidor' }));
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail || data.error || 'Error al registrar' },
      { status: res.status }
    );
  }
  return NextResponse.json(data);
}
