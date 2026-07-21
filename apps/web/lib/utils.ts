import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { NavEntry } from '@/lib/nav-types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STUDENT_ROLE = 'student';
export const ADMIN_ROLE = 'admin';
export const PSYCHOLOGIST_ROLE = 'psychologist';
export const PLATFORM_ADMIN_ROLE = 'platform_admin';

/** Roles with access to institutional portal (non-student). */
export const INSTITUTIONAL_ROLES = [ADMIN_ROLE, PSYCHOLOGIST_ROLE, PLATFORM_ADMIN_ROLE] as const;

/** @deprecated Legacy directivo roles — migrated to admin. Kept for type safety during rollout. */
export const DIRECTIVO_ROLES = [] as const;

export function getPortalForRole(role: string): 'student' | 'institutional' | 'platform' | null {
  if (role === PLATFORM_ADMIN_ROLE) return 'platform';
  if (role === STUDENT_ROLE) return 'student';
  if (role === ADMIN_ROLE || role === PSYCHOLOGIST_ROLE) return 'institutional';
  return null;
}

export function getDefaultPath(role: string): string {
  if (role === PLATFORM_ADMIN_ROLE) return '/platform/dashboard';
  if (role === STUDENT_ROLE) return '/student/twin/summary';
  if (role === ADMIN_ROLE || role === PSYCHOLOGIST_ROLE) return '/institutional/dashboard';
  return '/institutional/dashboard';
}

export function getProfilePath(role: string): string {
  if (role === PLATFORM_ADMIN_ROLE) return '/platform/profile';
  if (role === STUDENT_ROLE) return '/student/profile';
  return '/institutional/profile';
}

export const ROLE_LABELS: Record<string, string> = {
  student: 'Estudiante',
  admin: 'Administrador',
  psychologist: 'Psicólogo',
  platform_admin: 'Administrador de plataforma',
  // legacy labels (migrated)
  area_head: 'Administrador',
  dean: 'Administrador',
  vice_president: 'Administrador',
  rector: 'Administrador',
};

export const PSYCHOLOGIST_EMAIL = 'psicologo@utb.edu.co';

export function isCounselorEmail(email: string | null | undefined): boolean {
  return (email || '').toLowerCase() === PSYCHOLOGIST_EMAIL.toLowerCase();
}

export function isPsychologistRole(role: string, email?: string | null): boolean {
  if (role === PSYCHOLOGIST_ROLE) return true;
  return isCounselorEmail(email);
}

export function isPlatformAdmin(role: string): boolean {
  return role === PLATFORM_ADMIN_ROLE;
}

export function isDirectivoRole(_role: string): boolean {
  return false;
}

export function isStaffAdmin(role: string): boolean {
  return role === ADMIN_ROLE || role === PSYCHOLOGIST_ROLE || role === PLATFORM_ADMIN_ROLE;
}

/** Navegación platform admin (UTB-only) — incluye claves y seguridad */
export const PLATFORM_FULL_NAV: NavEntry[] = [
  { href: '/platform/dashboard', label: 'Dashboard' },
  { href: '/platform/requests', label: 'Solicitudes' },
  {
    label: 'Usuarios',
    items: [
      { href: '/platform/users/students', label: 'Estudiantes' },
      { href: '/platform/users/directivos', label: 'Staff' },
      { href: '/platform/users/create', label: 'Crear usuario' },
    ],
  },
  { href: '/institutional/risk', label: 'Riesgo de deserción' },
  { href: '/institutional/care-queue', label: 'CareQueue' },
  { href: '/institutional/analytics', label: 'Analítica' },
  { href: '/institutional/prediction', label: 'Predicción' },
  { href: '/institutional/actions', label: 'Acciones' },
  { href: '/institutional/executive-summary', label: 'Resumen ejecutivo' },
  { href: '/institutional/chat', label: 'Chat institucional' },
  {
    label: 'Oportunidades y apoyo',
    items: [
      { href: '/institutional/admin/content', label: 'Oportunidades' },
      { href: '/institutional/admin/resources', label: 'Recursos' },
    ],
  },
  { href: '/institutional/admin/support-requests', label: 'Apoyo humano' },
  { href: '/institutional/admin/academic-outcomes', label: 'Estados académicos' },
  { href: '/institutional/admin/auth-keys', label: 'Claves de rol' },
  { href: '/institutional/admin/security', label: 'Seguridad' },
];

/** Nav compartida admin + psicólogo (consulta + gestión). Claves/seguridad solo platform. */
export const ADMIN_INSTITUTIONAL_NAV: NavEntry[] = [
  { href: '/institutional/dashboard', label: 'Dashboard' },
  { href: '/institutional/analytics', label: 'Analítica' },
  { href: '/institutional/prediction', label: 'Predicción' },
  { href: '/institutional/risk', label: 'Riesgo de deserción' },
  { href: '/institutional/actions', label: 'Acciones' },
  { href: '/institutional/executive-summary', label: 'Resumen ejecutivo' },
  { href: '/institutional/chat', label: 'Chat institucional' },
  {
    label: 'Usuarios',
    adminOnly: true,
    items: [
      { href: '/institutional/admin/users/students', label: 'Estudiantes' },
      { href: '/institutional/admin/users/directivos', label: 'Staff' },
      { href: '/institutional/admin/users/create', label: 'Crear usuario' },
    ],
  },
  {
    label: 'Oportunidades y apoyo',
    adminOnly: true,
    items: [
      { href: '/institutional/admin/content', label: 'Oportunidades' },
      { href: '/institutional/admin/resources', label: 'Recursos' },
    ],
  },
  { href: '/institutional/admin/requests', label: 'Solicitudes', adminOnly: true },
  { href: '/institutional/admin/support-requests', label: 'Apoyo humano', adminOnly: true },
  { href: '/institutional/admin/academic-outcomes', label: 'Estados académicos', adminOnly: true },
  { href: '/institutional/care-queue', label: 'CareQueue', counselorOnly: true },
  { href: '/institutional/counselor/inbox', label: 'Inbox bienestar', counselorOnly: true },
];

/** @deprecated Use ADMIN_INSTITUTIONAL_NAV — directivos migrated to admin. */
export const DIRECTIVO_NAV: NavEntry[] = ADMIN_INSTITUTIONAL_NAV.filter(
  (e) => !('adminOnly' in e && e.adminOnly) && !('counselorOnly' in e && e.counselorOnly),
);

export function getInstitutionalNav(role: string): NavEntry[] {
  if (role === ADMIN_ROLE || role === PSYCHOLOGIST_ROLE) return ADMIN_INSTITUTIONAL_NAV;
  return DIRECTIVO_NAV;
}
