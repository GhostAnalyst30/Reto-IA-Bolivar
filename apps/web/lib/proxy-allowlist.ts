import { INSTITUTIONAL_ROLES, PLATFORM_ADMIN_ROLE, STUDENT_ROLE, ADMIN_ROLE, PSYCHOLOGIST_ROLE } from '@/lib/utils';

const ADMIN_PREFIX = '/admin';
const PLATFORM_PREFIX = '/platform';
const PROFILE_PREFIX = '/profile';
const SESSIONS_PREFIX = '/sessions';

const STUDENT_PREFIXES = [
  '/chats',
  '/paths',
  '/search',
  '/resources',
  '/saved-resources',
  '/progress',
  '/programs',
  '/psychometric',
  '/opportunities',
  '/support-requests',
  '/mood-checkins',
  '/self-help',
];

const INSTITUTIONAL_PREFIXES = ['/institutional'];

function isPlatformAdminFullAccess(path: string, role: string): boolean {
  if (role !== PLATFORM_ADMIN_ROLE) return false;
  if (path.includes('..') || path.startsWith('http')) return false;
  return path.startsWith('/');
}

function isStaff(role: string): boolean {
  return (
    role === PLATFORM_ADMIN_ROLE
    || role === ADMIN_ROLE
    || role === PSYCHOLOGIST_ROLE
    || INSTITUTIONAL_ROLES.includes(role as typeof INSTITUTIONAL_ROLES[number])
  );
}

export function isPathAllowed(path: string, role: string): boolean {
  if (isPlatformAdminFullAccess(path, role)) return true;

  if (path.includes('..') || path.startsWith('http')) return false;
  if (!path.startsWith('/')) return false;

  if (path.startsWith(PLATFORM_PREFIX)) {
    return role === PLATFORM_ADMIN_ROLE;
  }

  if (path.startsWith(PROFILE_PREFIX) || path.startsWith(SESSIONS_PREFIX)) {
    return true;
  }

  // Auth keys / security API: platform only
  if (path.startsWith('/admin/auth-keys') || path.startsWith('/admin/security') || path.startsWith('/admin/sessions')) {
    return role === PLATFORM_ADMIN_ROLE;
  }

  if (path.startsWith('/admin/requests')) {
    return isStaff(role);
  }

  if (path.startsWith(ADMIN_PREFIX)) {
    return role === ADMIN_ROLE || role === PSYCHOLOGIST_ROLE || role === PLATFORM_ADMIN_ROLE;
  }

  if (path.startsWith('/opportunities/admin')) {
    return isStaff(role);
  }

  if (INSTITUTIONAL_PREFIXES.some((p) => path.startsWith(p))) {
    return isStaff(role);
  }

  if (STUDENT_PREFIXES.some((p) => path.startsWith(p))) {
    return role === STUDENT_ROLE || role === PLATFORM_ADMIN_ROLE;
  }

  return false;
}
