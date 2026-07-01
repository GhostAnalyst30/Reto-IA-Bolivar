import { PortalShell, STUDENT_NAV } from '@/components/layout/PortalShell';
import { getProfile } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile || profile.role !== 'student' || profile.status !== 'approved') {
    redirect('/pending-approval');
  }

  return (
    <PortalShell title="Portal Estudiante" subtitle={profile.full_name || profile.email} nav={STUDENT_NAV} role={profile.role}>
      {children}
    </PortalShell>
  );
}
