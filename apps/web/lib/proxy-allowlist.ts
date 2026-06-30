import { INSTITUTIONAL_ROLES, STUDENT_ROLE } from '@/lib/utils';

const ADMIN_PREFIX = '/admin';

const STUDENT_PREFIXES = [
  '/chats',
  '/paths',
  '/search',
  '/resources',
  '/saved-resources',
  '/progress',
  '/programs',
  '/vocational',
];

const INSTITUTIONAL_PREFIXES = [
  '/institutional',
];

export function isPathAllowed(path: string, role: string): boolean {
  if (path.includes('..') || path.startsWith('http')) return false;
  if (!path.startsWith('/')) return false;

  if (path.startsWith(ADMIN_PREFIX)) {
    return role === 'admin';
  }

  if (INSTITUTIONAL_PREFIXES.some((p) => path.startsWith(p))) {
    return role === 'admin' || INSTITUTIONAL_ROLES.includes(role as typeof INSTITUTIONAL_ROLES[number]);
  }

  if (STUDENT_PREFIXES.some((p) => path.startsWith(p))) {
    return role === STUDENT_ROLE;
  }

  return false;
}
