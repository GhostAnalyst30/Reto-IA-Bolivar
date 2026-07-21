import { PortalShell, STUDENT_NAV } from '@/components/layout/PortalShell';
import { getPortalProfile } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { isPlatformAdmin } from '@/lib/utils';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getPortalProfile();
  if (!profile || profile.status !== 'approved') {
    redirect('/pending-approval');
  }
  if (profile.role !== 'student' && !isPlatformAdmin(profile.role)) {
    redirect('/login');
  }

  return (
    <PortalShell nav={STUDENT_NAV} role={profile.role} portal="student">
      {children}
    </PortalShell>
  );
}
