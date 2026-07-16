import { headers } from 'next/headers';
import { getProfile } from '@/lib/supabase/server';

export interface PortalProfile {
  role: string;
  status: string;
  institution_id: string | null;
}

/** Profile from middleware headers (fast path) with DB fallback. */
export async function getPortalProfile(): Promise<PortalProfile | null> {
  const h = await headers();
  const role = h.get('x-user-role');
  const status = h.get('x-user-status');

  if (role && status) {
    const institutionId = h.get('x-user-institution-id');
    return {
      role,
      status,
      institution_id: institutionId || null,
    };
  }

  const profile = await getProfile();
  if (!profile) return null;

  return {
    role: profile.role,
    status: profile.status,
    institution_id: profile.institution_id ?? null,
  };
}
