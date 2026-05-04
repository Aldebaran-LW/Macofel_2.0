'use client';

import { usePathname } from 'next/navigation';

/** Base do painel de catálogo: `/admin` ou espelho em `/painel-loja/gestao-site` (Gerente site). */
export function useAdminUiBasePath(): '/admin' | '/painel-loja/gestao-site' {
  const pathname = usePathname();
  if (pathname?.startsWith('/painel-loja/gestao-site')) {
    return '/painel-loja/gestao-site';
  }
  return '/admin';
}
