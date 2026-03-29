import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const TOKEN_COOKIE = 'algo_admin_token';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all GET requests on API routes (public read access for dashboard)
  if (req.method === 'GET') {
    if (pathname.startsWith('/admin')) {
      return checkAuth(req);
    }
    return NextResponse.next();
  }

  // All non-GET requests on matched routes require auth
  return checkAuth(req);
}

async function checkAuth(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const authed = token ? await verifyToken(token) : false;

  if (authed) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/users/:path*',
    '/api/problems/:path*',
    '/api/sync/:path*',
  ],
};
