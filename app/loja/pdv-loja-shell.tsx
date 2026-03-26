'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';

type InitMessage = { type: 'pdv-macofel-init'; apiKey: string };

type PdvLojaShellProps = {
  apiKey: string;
  /** URL absoluta ou path (/downloads/...) do instalador Windows */
  desktopInstallerUrl: string | null;
  /** Evita cache antigo do HTML do PDV estático após deploy */
  lojaAssetVersion: string;
  /** Só Master: página com instruções e variáveis de ambiente */
  masterInstallerDocsHref: string | null;
};

export function PdvLojaShell({
  apiKey,
  desktopInstallerUrl,
  lojaAssetVersion,
  masterInstallerDocsHref,
}: PdvLojaShellProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const iframeSrc = useMemo(() => {
    const base = '/loja/index.html';
    return lojaAssetVersion ? `${base}?v=${encodeURIComponent(lojaAssetVersion)}` : base;
  }, [lojaAssetVersion]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendKey = () => {
      const w = iframe.contentWindow;
      if (!w) return;
      const msg: InitMessage = { type: 'pdv-macofel-init', apiKey };
      w.postMessage(msg, window.location.origin);
    };

    const onIframeLoad = () => sendKey();

    const onWindowMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'pdv-macofel-ready') {
        sendKey();
      }
    };

    iframe.addEventListener('load', onIframeLoad);
    window.addEventListener('message', onWindowMessage);
    return () => {
      iframe.removeEventListener('load', onIframeLoad);
      window.removeEventListener('message', onWindowMessage);
    };
  }, [apiKey]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950">
      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900 px-3 text-xs text-neutral-400">
        <span className="truncate">PDV (modo loja) — equipe autorizada</span>
        <div className="flex shrink-0 items-center gap-3">
          {masterInstallerDocsHref && (
            <Link
              href={masterInstallerDocsHref}
              className="text-emerald-400/90 underline-offset-2 hover:text-emerald-300 hover:underline"
            >
              Instalação (Master)
            </Link>
          )}
          {desktopInstallerUrl ? (
            <a
              href={desktopInstallerUrl}
              className="font-medium text-amber-300/95 underline-offset-2 hover:text-amber-200 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Baixar PDV Desktop
            </a>
          ) : (
            <span
              className="text-neutral-600"
              title="Defina PDV_DESKTOP_INSTALLER_URL ou PDV_DESKTOP_INSTALLER_PATH no servidor"
            >
              Desktop: URL não configurada
            </span>
          )}
        </div>
      </header>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="PDV Macofel"
        className="h-full min-h-0 w-full flex-1 border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
