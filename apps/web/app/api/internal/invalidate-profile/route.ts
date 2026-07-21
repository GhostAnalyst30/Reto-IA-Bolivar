import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { invalidateProfileCache } from '@/lib/middleware-cache';

/**
 * Clears Next.js middleware profile cache after admin approve/reject
 * so the applicant is not stuck on /pending-approval for the TTL window.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const role = profile?.role || '';
  if (role !== 'admin' && role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { user_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userId = body.user_id?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  invalidateProfileCache(userId);
  return NextResponse.json({ ok: true });
}
