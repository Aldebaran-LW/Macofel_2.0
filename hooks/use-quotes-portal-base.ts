'use client';

import { usePathname } from 'next/navigation';

/** Base path para orçamentos: `/admin` ou `/painel-loja` consoante a área atual. */
export function useQuotesPortalBase(): '/admin' | '/painel-loja' {
  const pathname = usePathname();
  return pathname?.startsWith('/painel-loja') ? '/painel-loja' : '/admin';
}
