import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { NavEntry } from '@/lib/nav-types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const INSTITUTIONAL_ROLES = ['area_head', 'dean', 'vice_president', 'rector', 'admin'] as const;
export const STUDENT_ROLE = 'student';
export const PLATFORM_ADMIN_ROLE = 'platform_admin';
export const DIRECTIVO_ROLES = ['area_head', 'dean', 'vice_president', 'rector'] as const;

export function getPortalForRole(role: string): 'student' | 'institutional' | 'platform' | null {
  if (role === PLATFORM_ADMIN_ROLE) return 'platform';
  if (role === STUDENT_ROLE) return 'student';
  if (INSTITUTIONAL_ROLES.includes(role as typeof INSTITUTIONAL_ROLES[number])) return 'institutional';
  return null;
}

export function getDefaultPath(role: string): string {
  if (role === PLATFORM_ADMIN_ROLE) return '/platform/dashboard';
  if (role === STUDENT_ROLE) return '/student/twin/summary';
  if (role === 'admin') return '/institutional/admin/requests';
  return '/institutional/dashboard';
}

export function getProfilePath(role: string): string {
  if (role === PLATFORM_ADMIN_ROLE) return '/platform/profile';
  if (role === STUDENT_ROLE) return '/student/profile';
  return '/institutional/profile';
}

export const ROLE_LABELS: Record<string, string> = {
  student: 'Estudiante',
  area_head: 'Jefe de Área',
  dean: 'Decano',
  vice_president: 'Vicerrector',
  rector: 'Rector',
  admin: 'Administrador institucional',
  platform_admin: 'Administrador de plataforma',
};

export function isPlatformAdmin(role: string): boolean {
  return role === PLATFORM_ADMIN_ROLE;
}

export function isDirectivoRole(role: string): boolean {
  return DIRECTIVO_ROLES.includes(role as typeof DIRECTIVO_ROLES[number]);
}

/** Navegación platform admin (UTB-only) */
export const PLATFORM_FULL_NAV: NavEntry[] = [
  { href: '/platform/dashboard', label: 'Dashboard' },
  { href: '/platform/requests', label: 'Solicitudes' },
  {
    label: 'Usuarios',
    items: [
      { href: '/platform/users/students', label: 'Estudiantes' },
      { href: '/platform/users/directivos', label: 'Directivos' },
      { href: '/platform/users/create', label: 'Crear usuario' },
    ],
  },
  { href: '/institutional/risk', label: 'Riesgo de deserción' },
  { href: '/institutional/analytics', label: 'Analítica' },
  { href: '/institutional/prediction', label: 'Predicción' },
  { href: '/institutional/actions', label: 'Acciones' },
  { href: '/institutional/executive-summary', label: 'Resumen ejecutivo' },
  {
    label: 'Oportunidades y apoyo',
    items: [
      { href: '/institutional/admin/content', label: 'Oportunidades' },
      { href: '/institutional/admin/resources', label: 'Recursos' },
    ],
  },
  { href: '/institutional/admin/programs', label: 'Programas académicos' },
  { href: '/institutional/admin/auth-keys', label: 'Claves de rol' },
  { href: '/institutional/admin/support-requests', label: 'Apoyo humano' },
  { href: '/institutional/admin/academic-outcomes', label: 'Estados académicos' },
  { href: '/institutional/admin/security', label: 'Seguridad' },
];

/** Nav directivos (consulta) */
export const DIRECTIVO_NAV: NavEntry[] = [
  { href: '/institutional/dashboard', label: 'Dashboard' },
  { href: '/institutional/analytics', label: 'Analítica' },
  { href: '/institutional/prediction', label: 'Predicción' },
  { href: '/institutional/risk', label: 'Riesgo de deserción' },
  { href: '/institutional/actions', label: 'Acciones' },
  { href: '/institutional/executive-summary', label: 'Resumen ejecutivo' },
  { href: '/institutional/chat', label: 'Chat institucional' },
];

/** Nav admin institucional (gestión) */
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
      { href: '/institutional/admin/users/directivos', label: 'Directivos' },
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
  { href: '/institutional/admin/programs', label: 'Programas académicos', adminOnly: true },
  { href: '/institutional/admin/requests', label: 'Solicitudes', adminOnly: true },
  { href: '/institutional/admin/support-requests', label: 'Apoyo humano', adminOnly: true },
  { href: '/institutional/admin/academic-outcomes', label: 'Estados académicos', adminOnly: true },
  { href: '/institutional/admin/auth-keys', label: 'Claves de rol', adminOnly: true },
  { href: '/institutional/admin/security', label: 'Seguridad', adminOnly: true },
];

export function getInstitutionalNav(role: string): NavEntry[] {
  if (role === 'admin') return ADMIN_INSTITUTIONAL_NAV;
  return DIRECTIVO_NAV;
}

