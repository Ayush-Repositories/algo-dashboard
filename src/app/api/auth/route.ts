import { NextResponse } from 'next/server';
import { generateToken, isAuthenticated, TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await generateToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  });
  return res;
}

export async function GET() {
  const authed = await isAuthenticated();
  return NextResponse.json({ authenticated: authed });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
