import { PlatformShell } from '@/components/layout/PlatformShell';
import { PortalShell } from '@/components/layout/PortalShell';
import { getPortalProfile } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import {
  INSTITUTIONAL_ROLES,
  isPlatformAdmin,
  getInstitutionalNav,
  PLATFORM_FULL_NAV,
  isPsychologistRole,
  ADMIN_ROLE,
  PSYCHOLOGIST_ROLE,
} from '@/lib/utils';
import { getProfile } from '@/lib/supabase/server';

export default async function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  const profile = await getPortalProfile();
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

  const fullProfile = await getProfile();
  const isCounselor = isPsychologistRole(profile.role, fullProfile?.email);
  const isAdmin = profile.role === ADMIN_ROLE || profile.role === PSYCHOLOGIST_ROLE;

  return (
    <PortalShell
      nav={getInstitutionalNav(profile.role)}
      isAdmin={isAdmin}
      isCounselor={isCounselor}
      role={profile.role}
      portal="institutional"
    >
      {children}
    </PortalShell>
  );
}
