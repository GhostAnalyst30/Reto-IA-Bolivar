import { redirect } from 'next/navigation';

export default function PlatformUsersRedirect() {
  redirect('/platform/users/students');
}
