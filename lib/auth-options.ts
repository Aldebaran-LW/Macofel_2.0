import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export const authOptions: NextAuthOptions = {
  // Não usamos PrismaAdapter porque:
  // 1. Estamos usando CredentialsProvider (não OAuth)
  // 2. Estamos usando strategy: 'jwt' (sessões no token, não no banco)
  // 3. O cliente PostgreSQL não tem todos os modelos (category/product estão no MongoDB)
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('[AUTH] Credenciais vazias');
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.error(`[AUTH] Usuário não encontrado: ${credentials.email}`);
            return null;
          }

          if (!user.password) {
            console.error(`[AUTH] Usuário sem senha: ${credentials.email}`);
            return null;
          }

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            console.error(`[AUTH] Senha incorreta para: ${credentials.email}`);
            return null;
          }

          console.log(`[AUTH] Login bem-sucedido para: ${credentials.email}`);
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
          };
        } catch (error: any) {
          console.error('[AUTH] Erro no authorize:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: '/login',
    signOut: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Configurações para produção (HTTPS)
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
      },
    },
  },
};
