import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { DIRECT_CHECKOUT_ENABLED } from '@/lib/sales-mode';
import { hasPdvFullWebAccess, isAdminDashboardRole } from '@/lib/permissions';

function isLojaRoute(pathname: string) {
  return pathname === '/loja' || pathname.startsWith('/loja/');
}

const authMiddleware = withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname.startsWith('/checkout') && !DIRECT_CHECKOUT_ENABLED) {
      return NextResponse.redirect(new URL('/carrinho', req.url));
    }

    const token = req.nextauth.token;
    const isAdmin = isAdminDashboardRole(token?.role as string | undefined);
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    const isAdminLoginRoute = req.nextUrl.pathname === '/admin/login';

    if (isAdminRoute && !isAdminLoginRoute && !token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    if (isAdminRoute && !isAdminLoginRoute && token && !isAdmin) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    if (isAdminLoginRoute && token && isAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
        const isAdminLoginRoute = req.nextUrl.pathname === '/admin/login';

        if (isAdminLoginRoute) {
          return true;
        }

        if (isAdminRoute) {
          return !!token && isAdminDashboardRole(token.role as string | undefined);
        }

        return !!token;
      },
    },
  }
);

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;

  if (isLojaRoute(pathname)) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    const token = await getToken({ req, secret });
    if (!token) {
      const u = new URL('/login', req.url);
      u.searchParams.set('callbackUrl', `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(u);
    }
    if (!hasPdvFullWebAccess(token.role as string | undefined)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  return authMiddleware(req as never, event);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/perfil/:path*',
    '/meus-pedidos/:path*',
    '/minha-conta/:path*',
    '/carrinho/:path*',
    '/checkout/:path*',
    '/loja',
    '/loja/:path*',
  ],
};
