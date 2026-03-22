'use client';

import { useEffect, useRef } from 'react';

type InitMessage = { type: 'pdv-macofel-init'; apiKey: string };

export function PdvLojaShell({ apiKey }: { apiKey: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      <header className="flex h-10 shrink-0 items-center border-b border-neutral-800 bg-neutral-900 px-3 text-xs text-neutral-400">
        PDV (modo loja) — apenas administradores
      </header>
      <iframe
        ref={iframeRef}
        src="/loja/index.html"
        title="PDV Macofel"
        className="h-full min-h-0 w-full flex-1 border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
