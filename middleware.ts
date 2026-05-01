import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { DIRECT_CHECKOUT_ENABLED } from '@/lib/sales-mode';
import {
  hasPdvFullWebAccess,
  isAdminDashboardRole,
  isMasterAdminPathname,
  isMasterAdminRole,
  isPainelLojaRole,
} from '@/lib/permissions';
import { pingTelegramBotWakeIfStale } from '@/lib/telegram-render-wake';

function isLojaRoute(pathname: string) {
  return pathname === '/loja' || pathname.startsWith('/loja/');
}

/**
 * Rotas que não devem passar pelo gate `authorized: !!token` do `withAuth`.
 * Sem isso, `/login` exige sessão → NextAuth redireciona de volta para `/login`
 * com `callbackUrl` aninhado (ERR_TOO_MANY_REDIRECTS).
 */
function isPublicStorefrontPath(pathname: string): boolean {
  if (
    pathname === '/login' ||
    pathname === '/logout' ||
    pathname === '/cadastro' ||
    pathname === '/'
  ) {
    return true;
  }
  if (
    pathname.startsWith('/catalogo') ||
    pathname.startsWith('/produto/') ||
    pathname.startsWith('/decar')
  ) {
    return true;
  }
  return false;
}

function shouldWakeTelegramBotOnPublicHit(pathname: string): boolean {
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap')
  ) {
    return false;
  }
  if (pathname.match(/\.(ico|png|jpg|jpeg|webp|gif|svg|woff2?|ttf|eot|pdf|txt|xml|map)$/i)) {
    return false;
  }
  return true;
}

const authMiddleware = withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname.startsWith('/checkout') && !DIRECT_CHECKOUT_ENABLED) {
      return NextResponse.redirect(new URL('/carrinho', req.url));
    }

    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string | undefined;
    const isAdmin = isAdminDashboardRole(role);
    const isAdminRoute = pathname.startsWith('/admin');
    const isAdminLoginRoute = pathname === '/admin/login';
    const isMasterArea = isMasterAdminPathname(pathname);

    if (isAdminRoute && !isAdminLoginRoute && !token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    if (isAdminRoute && !isAdminLoginRoute && token) {
      if (isMasterArea && !isMasterAdminRole(role)) {
        return NextResponse.redirect(new URL('/admin/dashboard?master=forbidden', req.url));
      }
      if (!isMasterArea && !isAdmin) {
        if (isPainelLojaRole(role)) {
          return NextResponse.redirect(new URL('/painel-loja', req.url));
        }
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
    }

    if (isAdminLoginRoute && token) {
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
      if (isPainelLojaRole(role)) {
        return NextResponse.redirect(new URL('/painel-loja', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const isAdminRoute = path.startsWith('/admin');
        const isAdminLoginRoute = path === '/admin/login';

        if (isPublicStorefrontPath(path)) {
          return true;
        }

        if (isAdminLoginRoute) {
          return true;
        }

        if (isAdminRoute) {
          if (!token) return false;
          if (isMasterAdminPathname(path)) {
            return isMasterAdminRole(token.role as string | undefined);
          }
          const r = token.role as string | undefined;
          if (isAdminDashboardRole(r)) return true;
          if (isPainelLojaRole(r)) return true;
          return false;
        }

        return !!token;
      },
    },
  }
);

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;

  /**
   * “Wake” opcional do bot na Render: quando alguém navega páginas públicas do site em produção,
   * faz um GET throttleado no `/health` do bot. Desligue com TELEGRAM_BOT_WAKE_URL=""
   */
  const wakeEnabledRaw = process.env.TELEGRAM_BOT_WAKE_URL;
  const wakeGloballyDisabled = wakeEnabledRaw != null && String(wakeEnabledRaw).trim() === '';
  if (!wakeGloballyDisabled && process.env.NODE_ENV === 'production' && shouldWakeTelegramBotOnPublicHit(pathname)) {
    pingTelegramBotWakeIfStale();
  }

  if (pathname.startsWith('/painel-loja')) {
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
    if (!isPainelLojaRole(token.role as string | undefined)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

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
    /*
     * Incluir rotas públicas para permitir disparo opcional ao navegar vitrine/catálogo.
     * Exclude estáticos grandes via filtro dentro do middleware.
     */
    '/((?!api/|_next/static|_next/image).*)',

    '/painel-loja',
    '/painel-loja/:path*',
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
