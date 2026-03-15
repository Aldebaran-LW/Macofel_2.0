import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.role === 'ADMIN';
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    const isAdminLoginRoute = req.nextUrl.pathname === '/admin/login';

    // Se tentando acessar área admin sem estar logado, redirecionar para login admin
    if (isAdminRoute && !isAdminLoginRoute && !token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Se tentando acessar área admin sem ser admin, redirecionar para login admin
    if (isAdminRoute && !isAdminLoginRoute && token && !isAdmin) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Se já está logado como admin e tenta acessar login admin, redirecionar para dashboard
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
        
        // Permitir acesso ao login admin sem autenticação
        if (isAdminLoginRoute) {
          return true;
        }
        
        // Para outras rotas admin, precisa estar autenticado E ser admin
        if (isAdminRoute) {
          return !!token && token.role === 'ADMIN';
        }
        
        // Para outras rotas protegidas, precisa estar autenticado
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/perfil/:path*', '/meus-pedidos/:path*', '/minha-conta/:path*', '/carrinho/:path*', '/checkout/:path*'],
};
