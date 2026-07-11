import { PlatformShell } from '@/components/layout/PlatformShell';
import { PLATFORM_FULL_NAV } from '@/lib/utils';
import { getProfile } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PLATFORM_ADMIN_ROLE } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile || profile.role !== PLATFORM_ADMIN_ROLE || profile.status !== 'approved') {
    redirect('/login');
  }

  return (
    <PlatformShell role={profile.role} nav={PLATFORM_FULL_NAV}>
      {children}
    </PlatformShell>
  );
}
