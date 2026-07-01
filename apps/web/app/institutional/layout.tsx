import { PortalShell, INSTITUTIONAL_NAV } from '@/components/layout/PortalShell';
import { getProfile } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { INSTITUTIONAL_ROLES } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile || !INSTITUTIONAL_ROLES.includes(profile.role as typeof INSTITUTIONAL_ROLES[number]) || profile.status !== 'approved') {
    redirect('/pending-approval');
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
