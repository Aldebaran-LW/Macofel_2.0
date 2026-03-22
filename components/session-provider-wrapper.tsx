'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

export default function SessionProviderWrapper({
  children,
  session,
}: {
  children: React.ReactNode;
  /** Sessão do servidor evita 500/hidratação frágil com useSession no primeiro paint. */
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session ?? undefined} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}
