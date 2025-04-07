import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Get the pathname
  const pathname = req.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = ['/auth/login', '/auth/signup'];
  const isPublicPath = publicPaths.includes(pathname);

  // Check for session cookie
  const hasCookie = req.cookies.has('session');

  // If no session and trying to access protected route
  if (!hasCookie && !isPublicPath) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // If has session and trying to access auth pages
  if (hasCookie && isPublicPath) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};