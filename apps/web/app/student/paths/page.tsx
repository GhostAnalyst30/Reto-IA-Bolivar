import { redirect } from 'next/navigation';

/** Rutas de aprendizaje fuera del núcleo anti-deserción. */
export default function PathsRedirectPage() {
  redirect('/student/twin/chat');
}
