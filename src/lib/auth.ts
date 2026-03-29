import { cookies } from 'next/headers';

const TOKEN_COOKIE = 'algo_admin_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return process.env.AUTH_SECRET || 'fallback-dev-secret';
}

async function hmacSign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacVerify(payload: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(payload);
  if (expected.length !== signature.length) return false;
  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

export async function generateToken(): Promise<string> {
  const payload = `admin:${Date.now()}`;
  const hmac = await hmacSign(payload);
  return btoa(`${payload}:${hmac}`);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon === -1) return false;
    const payload = decoded.slice(0, lastColon);
    const hmac = decoded.slice(lastColon + 1);
    return await hmacVerify(payload, hmac);
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export { TOKEN_COOKIE, TOKEN_MAX_AGE };
