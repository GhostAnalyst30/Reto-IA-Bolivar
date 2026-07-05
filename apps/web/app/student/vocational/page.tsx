import { redirect } from 'next/navigation';

/** Módulo vocacional retirado — redirige a encuesta de caracterización. */
export default function VocationalRedirectPage() {
  redirect('/student/onboarding/survey');
}
