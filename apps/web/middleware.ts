import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getDefaultPath, getPortalForRole, PLATFORM_ADMIN_ROLE } from '@/lib/utils';
import {
  getCachedProfile,
  getCachedPsychCompleted,
  setCachedProfile,
  setCachedPsychCompleted,
} from '@/lib/middleware-cache';

const PUBLIC_PATHS = ['/', '/login', '/register/student', '/register/institutional', '/register/check-email', '/auth/callback', '/auth/confirm', '/quienes-somos', '/terminos', '/forgot-password', '/reset-password'];
const AUTH_PATHS = ['/login', '/register/student', '/register/institutional', '/register/check-email', '/pending-approval', '/forgot-password', '/reset-password'];

interface ProfileEntry {
  role: string;
  status: string;
  institution_id?: string | null;
}

function attachPortalHeaders(
  request: NextRequest,
  response: NextResponse,
  profile: ProfileEntry,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', profile.role);
  requestHeaders.set('x-user-status', profile.status);
  requestHeaders.set('x-user-institution-id', profile.institution_id ?? '');

  const next = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.getAll().forEach(({ name, value }) => {
    next.cookies.set(name, value);
  });
  return next;
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let session = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // Stale/invalid refresh token — clear auth cookies so the user can log in again.
      const code = (error as { code?: string }).code || '';
      if (
        code === 'refresh_token_not_found'
        || /refresh token/i.test(error.message || '')
      ) {
        await supabase.auth.signOut();
        for (const cookie of request.cookies.getAll()) {
          if (cookie.name.includes('sb-') && cookie.name.includes('auth')) {
            response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
          }
        }
      }
    } else {
      session = data.session;
    }
  } catch {
    session = null;
  }
  const user = session?.user ?? null;
  const path = request.nextUrl.pathname;

  if (PUBLIC_PATHS.some(p => path === p || path.startsWith('/api/'))) {
    if (user && AUTH_PATHS.some(p => path.startsWith(p))) {
      let profile = getCachedProfile(user.id);
      if (!profile) {
        const { data } = await supabase.from('users').select('role, status, institution_id').eq('id', user.id).single();
        if (data) {
          setCachedProfile(user.id, data);
          profile = getCachedProfile(user.id);
        }
      }
      if (profile?.status === 'approved') {
        return NextResponse.redirect(new URL(getDefaultPath(profile.role), request.url));
      }
      if (profile?.status === 'pending' || profile?.status === 'rejected') {
        return NextResponse.redirect(new URL('/pending-approval', request.url));
      }
    }
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  let profile = getCachedProfile(user.id);
  if (!profile) {
    const { data } = await supabase
      .from('users')
      .select('role, status, institution_id')
      .eq('id', user.id)
      .single();
    if (!data) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    setCachedProfile(user.id, data);
    profile = getCachedProfile(user.id);
  }

  if (!profile) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isPlatformAdmin = profile.role === PLATFORM_ADMIN_ROLE;

  if (profile.status === 'pending' || profile.status === 'rejected') {
    if (!path.startsWith('/pending-approval')) {
      return NextResponse.redirect(new URL('/pending-approval', request.url));
    }
    return attachPortalHeaders(request, response, profile);
  }

  if (profile.status !== 'approved') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const portal = getPortalForRole(profile.role);

  if (path.startsWith('/platform') && !isPlatformAdmin) {
    return NextResponse.redirect(new URL(getDefaultPath(profile.role), request.url));
  }

  if (path.startsWith('/student') && portal !== 'student' && !isPlatformAdmin) {
    return NextResponse.redirect(new URL(getDefaultPath(profile.role), request.url));
  }

  if (path.startsWith('/institutional') && portal !== 'institutional' && !isPlatformAdmin) {
    return NextResponse.redirect(new URL(getDefaultPath(profile.role), request.url));
  }

  // Auth keys + security: platform_admin only
  if (
    (path.startsWith('/institutional/admin/auth-keys')
      || path.startsWith('/institutional/admin/security'))
    && !isPlatformAdmin
  ) {
    return NextResponse.redirect(new URL('/institutional/dashboard', request.url));
  }

  // Admin modules: admin + psychologist (+ platform)
  if (
    path.startsWith('/institutional/admin')
    && profile.role !== 'admin'
    && profile.role !== 'psychologist'
    && !isPlatformAdmin
  ) {
    return NextResponse.redirect(new URL('/institutional/dashboard', request.url));
  }

  if (
    profile.role === 'student' &&
    profile.status === 'approved' &&
    !path.startsWith('/student/onboarding') &&
    !path.startsWith('/student/profile')
  ) {
    let psychCompleted = getCachedPsychCompleted(user.id);
    if (psychCompleted === null) {
      try {
        const { data: psych } = await supabase
          .from('psychometric_assessments')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();
        psychCompleted = psych?.status === 'completed';
        setCachedPsychCompleted(user.id, psychCompleted);
      } catch {
        psychCompleted = true;
      }
    }
    if (!psychCompleted) {
      if (!path.startsWith('/student/onboarding/survey')) {
        return NextResponse.redirect(new URL('/student/onboarding/survey', request.url));
      }
    }
  }

  return attachPortalHeaders(request, response, profile);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
