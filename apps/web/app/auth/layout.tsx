import { AuthShell } from '@/app/(auth)/AuthShell';

export default function AuthRouteLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
