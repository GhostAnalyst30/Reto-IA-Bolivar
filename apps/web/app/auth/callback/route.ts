import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Solo se permiten rutas internas relativas para evitar open redirects. */
function safeNext(raw: string | null): string {
  const fallback = '/pending-approval';
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (raw.includes('://') || raw.includes('\\')) return fallback;
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmacion`);
}
