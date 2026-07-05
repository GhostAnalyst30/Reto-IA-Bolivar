import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getDefaultPath, getPortalForRole, PLATFORM_ADMIN_ROLE } from '@/lib/utils';

const PUBLIC_PATHS = ['/', '/login', '/register/student', '/register/institutional', '/register/check-email', '/auth/callback', '/quienes-somos', '/terminos', '/forgot-password', '/reset-password'];
const AUTH_PATHS = ['/login', '/register/student', '/register/institutional', '/register/check-email', '/pending-approval', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (PUBLIC_PATHS.some(p => path === p || path.startsWith('/api/'))) {
    if (user && AUTH_PATHS.some(p => path.startsWith(p))) {
      const { data: profile } = await supabase.from('users').select('role, status').eq('id', user.id).single();
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

  const { data: profile } = await supabase
    .from('users')
    .select('role, status, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isPlatformAdmin = profile.role === PLATFORM_ADMIN_ROLE;

  if (profile.status === 'pending' || profile.status === 'rejected') {
    if (!path.startsWith('/pending-approval')) {
      return NextResponse.redirect(new URL('/pending-approval', request.url));
    }
    return response;
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

  if (
    path.startsWith('/institutional/admin')
    && profile.role !== 'admin'
    && !isPlatformAdmin
  ) {
    return NextResponse.redirect(new URL('/institutional/analytics', request.url));
  }

  if (
    profile.role === 'student' &&
    profile.status === 'approved' &&
    !profile.institution_id &&
    !path.startsWith('/student/onboarding') &&
    !path.startsWith('/student/profile')
  ) {
    return NextResponse.redirect(new URL('/student/onboarding', request.url));
  }

  if (
    profile.role === 'student' &&
    profile.status === 'approved' &&
    profile.institution_id &&
    !path.startsWith('/student/onboarding') &&
    !path.startsWith('/student/profile') &&
    !path.startsWith('/student/twin')
  ) {
    try {
      const { data: psych } = await supabase
        .from('psychometric_assessments')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!psych || psych.status !== 'completed') {
        if (!path.startsWith('/student/onboarding/survey')) {
          return NextResponse.redirect(new URL('/student/onboarding/survey', request.url));
        }
      }
    } catch {
      /* table may not exist before migration */
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
