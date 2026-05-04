'use client';

import { usePathname } from 'next/navigation';

/** Base path para orçamentos: `/admin`, espelho `/painel-loja/gestao-site` ou `/painel-loja`. */
export function useQuotesPortalBase(): '/admin' | '/painel-loja/gestao-site' | '/painel-loja' {
  const pathname = usePathname();
  if (pathname?.startsWith('/painel-loja/gestao-site')) return '/painel-loja/gestao-site';
  if (pathname?.startsWith('/painel-loja')) return '/painel-loja';
  return '/admin';
}
