import type { Session, SupabaseClient } from '@supabase/supabase-js';

/** Returns JWT after signUp — uses session from signUp or signs in if confirmation is off. */
export async function getAccessTokenAfterSignUp(
  supabase: SupabaseClient,
  email: string,
  password: string,
  session: Session | null
): Promise<string | null> {
  if (session?.access_token) return session.access_token;

  const { data } = await supabase.auth.signInWithPassword({ email, password });
  return data.session?.access_token ?? null;
}

export function bearerHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
