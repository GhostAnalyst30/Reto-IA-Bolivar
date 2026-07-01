import { PlatformShell } from '@/components/layout/PlatformShell';
import { PortalShell, INSTITUTIONAL_NAV } from '@/components/layout/PortalShell';
import { getProfile } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { INSTITUTIONAL_ROLES, PLATFORM_FULL_NAV, isPlatformAdmin } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile || profile.status !== 'approved') {
    redirect('/pending-approval');
  }

  const canAccess =
    isPlatformAdmin(profile.role)
    || INSTITUTIONAL_ROLES.includes(profile.role as typeof INSTITUTIONAL_ROLES[number]);

  if (!canAccess) {
    redirect('/login');
  }

  if (isPlatformAdmin(profile.role)) {
    return (
      <PlatformShell
        title="Suite Institucional"
        subtitle={profile.full_name || profile.email}
        role={profile.role}
        nav={PLATFORM_FULL_NAV}
      >
        {children}
      </PlatformShell>
    );
  }

  return (
    <PortalShell
      title="Suite Institucional"
      subtitle={profile.full_name || profile.email}
      nav={INSTITUTIONAL_NAV}
      isAdmin={profile.role === 'admin'}
      role={profile.role}
    >
      {children}
    </PortalShell>
  );
}
