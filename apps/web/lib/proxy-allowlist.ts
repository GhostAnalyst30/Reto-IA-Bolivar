import { INSTITUTIONAL_ROLES, PLATFORM_ADMIN_ROLE, STUDENT_ROLE } from '@/lib/utils';

const ADMIN_PREFIX = '/admin';
const PLATFORM_PREFIX = '/platform';
const PROFILE_PREFIX = '/profile';
const SESSIONS_PREFIX = '/sessions';
const REGISTER_PREFIX = '/register';

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

  if (path.startsWith(PLATFORM_PREFIX)) {
    return role === PLATFORM_ADMIN_ROLE;
  }

  if (path.startsWith(PROFILE_PREFIX) || path.startsWith(SESSIONS_PREFIX)) {
    return true;
  }

  if (path.startsWith(`${REGISTER_PREFIX}/link-institution`)) {
    return role === STUDENT_ROLE || role === 'student';
  }

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
