import { PortalShell, STUDENT_NAV, STUDENT_NAV_LEARNING } from '@/components/layout/PortalShell';
import { getProfile } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPlatformAdmin } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile || profile.status !== 'approved') {
    redirect('/pending-approval');
  }
  if (profile.role !== 'student' && !isPlatformAdmin(profile.role)) {
    redirect('/login');
  }

  return (
    <PortalShell title="Portal Estudiante UTB" subtitle={profile.full_name || profile.email} nav={STUDENT_NAV} learningNav={STUDENT_NAV_LEARNING} role={profile.role}>
      {children}
    </PortalShell>
  );
}
