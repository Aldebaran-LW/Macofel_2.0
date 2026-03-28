import type { UserRole } from '@/lib/permissions';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: UserRole;
      /** Login curto PDV — usado para filtrar vendas do vendedor no histórico web. */
      pdvUserName?: string | null;
    };
  }

  interface User {
    role?: UserRole;
    pdvUserName?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    pdvUserName?: string | null;
  }
}
