import { INSTITUTIONAL_ROLES, PLATFORM_ADMIN_ROLE, STUDENT_ROLE } from '@/lib/utils';

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

/** platform_admin tiene acceso completo a todas las rutas API del proxy */
function isPlatformAdminFullAccess(path: string, role: string): boolean {
  if (role !== PLATFORM_ADMIN_ROLE) return false;
  if (path.includes('..') || path.startsWith('http')) return false;
  return path.startsWith('/');
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

  // Solicitudes de registro: cualquier rol institucional puede aprobar/denegar
  if (path.startsWith('/admin/requests')) {
    return (
      role === PLATFORM_ADMIN_ROLE
      || INSTITUTIONAL_ROLES.includes(role as typeof INSTITUTIONAL_ROLES[number])
    );
  }

  if (path.startsWith(ADMIN_PREFIX)) {
    return role === 'admin' || role === PLATFORM_ADMIN_ROLE;
  }

  // Gestión de oportunidades/recursos: directivos y admins
  if (path.startsWith('/opportunities/admin')) {
    return (
      role === PLATFORM_ADMIN_ROLE
      || INSTITUTIONAL_ROLES.includes(role as typeof INSTITUTIONAL_ROLES[number])
    );
  }

  if (INSTITUTIONAL_PREFIXES.some((p) => path.startsWith(p))) {
    return (
      role === PLATFORM_ADMIN_ROLE
      || role === 'admin'
      || INSTITUTIONAL_ROLES.includes(role as typeof INSTITUTIONAL_ROLES[number])
    );
  }

  if (STUDENT_PREFIXES.some((p) => path.startsWith(p))) {
    return role === STUDENT_ROLE || role === PLATFORM_ADMIN_ROLE;
  }

  return false;
}
