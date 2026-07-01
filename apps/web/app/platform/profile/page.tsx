'use client';

import { ProfileForm } from '@/components/profile/ProfileForm';

export default function PlatformProfilePage() {
  return (
    <ProfileForm
      title="Perfil de plataforma"
      subtitle="admin@bolivar.ia.com"
      showReportInfo
    />
  );
}
