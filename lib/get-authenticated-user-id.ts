import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth-options';

/** Igual a `authOptions.cookies.sessionToken.name` — precisa bater com o cookie gravado no login. */
const sessionCookieName = `${
  process.env.NODE_ENV === 'production' ? '__Secure-' : ''
}next-auth.session-token`;

const secureCookie = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;

/**
 * ID do usuário nas API routes do App Router.
 * `getToken({ req })` lê o cookie do pedido atual; isso cobre casos em que
 * `getServerSession` não enxerga a sessão (Next.js + NextAuth).
 */
export async function getAuthenticatedUserId(req?: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  if (req) {
    try {
      const token = await getToken({
        req,
        secret,
        secureCookie,
        cookieName: sessionCookieName,
      });
      if (token) {
        const id = (token.id as string | undefined) || (token.sub as string | undefined);
        if (id) return String(id);
      }
    } catch (e) {
      console.error('[auth] getToken:', e);
    }
  }

  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const id = (session.user as any).id as string | undefined;
      if (id) return String(id);
    }
  } catch (e) {
    console.error('[auth] getServerSession:', e);
  }

  return null;
}

export type RequestAuthUser = {
  userId: string;
  role: string;
  email: string;
  name: string;
};

/** Sessão a partir do pedido (cookie JWT) — uso nas API routes, alinhado com o carrinho. */
export async function getAuthUserFromRequest(
  req: NextRequest
): Promise<RequestAuthUser | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const token = await getToken({
      req,
      secret,
      secureCookie,
      cookieName: sessionCookieName,
    });
    if (token) {
      const userId = String((token.id as string) || (token.sub as string) || '');
      if (userId) {
        return {
          userId,
          role: String((token as { role?: string }).role ?? ''),
          email: String((token as { email?: string }).email ?? ''),
          name: String(
            (token as { name?: string }).name ??
              (token as { email?: string }).email ??
              ''
          ),
        };
      }
    }
  } catch (e) {
    console.error('[auth] getAuthUserFromRequest getToken:', e);
  }

  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const userId = String((session.user as { id?: string }).id ?? '');
      if (userId) {
        return {
          userId,
          role: String((session.user as { role?: string }).role ?? ''),
          email: String(session.user.email ?? ''),
          name: String(session.user.name ?? session.user.email ?? ''),
        };
      }
    }
  } catch (e) {
    console.error('[auth] getAuthUserFromRequest getServerSession:', e);
  }

  return null;
}
