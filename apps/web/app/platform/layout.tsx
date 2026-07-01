import { PlatformShell, PLATFORM_NAV } from '@/components/layout/PlatformShell';
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
    <PlatformShell
      title="Administración de Plataforma"
      subtitle={profile.full_name || profile.email}
      role={profile.role}
      nav={PLATFORM_NAV}
    >
      {children}
    </PlatformShell>
  );
}
