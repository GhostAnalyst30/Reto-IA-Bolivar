import { redirect } from 'next/navigation';

export default function TutorRedirectPage() {
  redirect('/student/twin/chat');
}
