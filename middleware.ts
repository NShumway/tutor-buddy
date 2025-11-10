import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token');
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/login', '/signup', '/api/auth/login', '/api/auth/signup'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected routes - redirect to login if no session
  if (!accessToken && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
