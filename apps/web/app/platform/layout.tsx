import { PlatformShell } from '@/components/layout/PlatformShell';
import { PLATFORM_FULL_NAV } from '@/lib/utils';
import { getPortalProfile } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { PLATFORM_ADMIN_ROLE } from '@/lib/utils';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const profile = await getPortalProfile();
  if (!profile) {
    redirect('/login');
  }
  if (profile.status === 'pending' || profile.status === 'rejected') {
    redirect('/pending-approval');
  }
  if (profile.role !== PLATFORM_ADMIN_ROLE || profile.status !== 'approved') {
    redirect('/login');
  }

  return (
    <PlatformShell role={profile.role} nav={PLATFORM_FULL_NAV}>
      {children}
    </PlatformShell>
  );
}
