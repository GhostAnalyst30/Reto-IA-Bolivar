import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const INSTITUTIONAL_ROLES = ['area_head', 'dean', 'vice_president', 'rector', 'admin'] as const;
export const STUDENT_ROLE = 'student';
export const PLATFORM_ADMIN_ROLE = 'platform_admin';

export function getPortalForRole(role: string): 'student' | 'institutional' | 'platform' | null {
  if (role === PLATFORM_ADMIN_ROLE) return 'platform';
  if (role === STUDENT_ROLE) return 'student';
  if (INSTITUTIONAL_ROLES.includes(role as typeof INSTITUTIONAL_ROLES[number])) return 'institutional';
  return null;
}

export function getDefaultPath(role: string): string {
  if (role === PLATFORM_ADMIN_ROLE) return '/platform/dashboard';
  if (role === STUDENT_ROLE) return '/student/twin/summary';
  if (role === 'admin') return '/institutional/admin';
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

/** Navegación completa para platform admin */
export const PLATFORM_FULL_NAV = [
  { href: '/platform/dashboard', label: 'Dashboard plataforma' },
  { href: '/platform/institutions', label: 'Instituciones' },
  { href: '/platform/users', label: 'Usuarios' },
  { href: '/institutional/dashboard', label: 'Dashboard' },
  { href: '/institutional/risk', label: 'Riesgo de deserción' },
  { href: '/institutional/analytics', label: 'Analítica' },
  { href: '/institutional/prediction', label: 'Predicción' },
  { href: '/institutional/documents', label: 'Documental' },
  { href: '/institutional/executive-summary', label: 'Resumen ejecutivo' },
  { href: '/institutional/actions', label: 'Acciones' },
  { href: '/institutional/director', label: 'Director de IA' },
  { href: '/institutional/admin', label: 'Administración' },
  { href: '/institutional/admin/requests', label: 'Solicitudes' },
  { href: '/institutional/admin/auth-keys', label: 'Claves de rol' },
  { href: '/institutional/admin/security', label: 'Seguridad' },
  { href: '/institutional/admin/programs', label: 'Programas académicos' },
] as const;
