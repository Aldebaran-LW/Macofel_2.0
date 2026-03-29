import type { AppProps } from 'next/app';

/** Shell mínimo só para rotas em `pages/` (404/500); o site principal está em `app/`. */
export default function PagesApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
