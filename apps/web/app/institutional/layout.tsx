import { PlatformShell } from '@/components/layout/PlatformShell';
import { PortalShell } from '@/components/layout/PortalShell';
import { getProfile } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { INSTITUTIONAL_ROLES, isPlatformAdmin, getInstitutionalNav, PLATFORM_FULL_NAV } from '@/lib/utils';

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
      <PlatformShell role={profile.role} nav={PLATFORM_FULL_NAV}>
        {children}
      </PlatformShell>
    );
  }

  return (
    <PortalShell
      nav={getInstitutionalNav(profile.role)}
      isAdmin={profile.role === 'admin'}
      role={profile.role}
      portal="institutional"
    >
      {children}
    </PortalShell>
  );
}
