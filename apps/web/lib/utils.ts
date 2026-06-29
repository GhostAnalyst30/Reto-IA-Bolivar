import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const INSTITUTIONAL_ROLES = ['area_head', 'dean', 'vice_president', 'rector', 'admin'] as const;
export const STUDENT_ROLE = 'student';

export function getPortalForRole(role: string): 'student' | 'institutional' | null {
  if (role === STUDENT_ROLE) return 'student';
  if (INSTITUTIONAL_ROLES.includes(role as typeof INSTITUTIONAL_ROLES[number])) return 'institutional';
  return null;
}

export function getDefaultPath(role: string): string {
  if (role === STUDENT_ROLE) return '/student/chat';
  if (role === 'admin') return '/institutional/admin';
  return '/institutional/analytics';
}

export const ROLE_LABELS: Record<string, string> = {
  student: 'Estudiante',
  area_head: 'Jefe de Área',
  dean: 'Decano',
  vice_president: 'Vicerrector',
  rector: 'Rector',
  admin: 'Administrador',
};
