import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getDefaultPath, getPortalForRole, INSTITUTIONAL_ROLES } from '@/lib/utils';

const PUBLIC_PATHS = ['/', '/login', '/register/student', '/register/institutional', '/register/check-email', '/auth/callback'];
const AUTH_PATHS = ['/login', '/register/student', '/register/institutional', '/register/check-email', '/pending-approval'];

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
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

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

  if (path.startsWith('/student') && portal !== 'student') {
    return NextResponse.redirect(new URL(getDefaultPath(profile.role), request.url));
  }

  if (path.startsWith('/institutional') && portal !== 'institutional') {
    return NextResponse.redirect(new URL(getDefaultPath(profile.role), request.url));
  }

  if (path.startsWith('/institutional/admin') && profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/institutional/analytics', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
