'use client';

import { useCallback, useState } from 'react';
import { Bot, Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const BOT_USERNAME = 'Macofel_bot';

type TelegramLinkPanelProps = {
  /** Título da página (ex.: admin vs equipa) */
  title?: string;
  /** Texto de apoio abaixo do título */
  lead?: string;
  /** Mostrar nota técnica no fim (só no admin) */
  showEnvHint?: boolean;
};

export function TelegramLinkPanel({
  title = 'Telegram',
  lead = 'Vincule a sua conta do painel ao bot',
  showEnvHint = false,
}: TelegramLinkPanelProps) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [ttlMinutes, setTtlMinutes] = useState<number | null>(null);

  const generateCode = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/link-code', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : `Erro ${res.status}`);
        return;
      }
      if (typeof data.code === 'string') {
        setCode(data.code);
        setExpiresAt(typeof data.expiresAt === 'string' ? data.expiresAt : null);
        setTtlMinutes(typeof data.ttlMinutes === 'number' ? data.ttlMinutes : null);
        toast.success('Código gerado. Use-o no Telegram antes de expirar.');
      } else {
        toast.error('Resposta inválida do servidor');
      }
    } catch {
      toast.error('Erro de rede');
    } finally {
      setLoading(false);
    }
  }, []);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Código copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const copyVincularCommand = async () => {
    if (!code) return;
    const line = `/vincular ${code}`;
    try {
      await navigator.clipboard.writeText(line);
      toast.success('Comando copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Bot className="h-10 w-10 shrink-0 text-sky-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600">
            {lead}{' '}
            <a
              href={`https://t.me/${BOT_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-red-600 underline"
            >
              @{BOT_USERNAME}
            </a>{' '}
            por código ou pelo telefone cadastrado (comando <code className="rounded bg-gray-100 px-1 text-xs">/entrar</code>
            ).
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 font-medium text-gray-900">
          <KeyRound className="h-5 w-5 text-amber-600" />
          Código de vínculo (uso único)
        </div>
        <p className="text-sm text-gray-600">
          Gere um código e envie no Telegram: <strong>/vincular CODIGO</strong>. Cada código expira após alguns
          minutos.
        </p>
        <Button
          type="button"
          className="bg-red-600 hover:bg-red-700"
          disabled={loading}
          onClick={() => void generateCode()}
        >
          {loading ? 'A gerar…' : 'Gerar novo código'}
        </Button>

        {code ? (
          <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-xs text-amber-900">
              {ttlMinutes != null ? `Válido cerca de ${ttlMinutes} min.` : null}
              {expiresAt ? ` Até ${new Date(expiresAt).toLocaleString('pt-PT')}.` : null}
            </p>
            <p className="font-mono text-2xl font-bold tracking-wider text-gray-900">{code}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyCode()}>
                <Copy className="mr-1 h-4 w-4" />
                Copiar código
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyVincularCommand()}>
                <Copy className="mr-1 h-4 w-4" />
                Copiar /vincular …
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
        <p className="font-medium text-gray-900">Alternativa: telefone</p>
        <p>
          Com o telefone no seu cadastro de utilizador, no bot use <strong>/entrar</strong> e partilhe o número.
        </p>
        {showEnvHint ? (
          <p className="text-xs text-gray-500">
            O servidor precisa de <code className="rounded bg-gray-100 px-1">TELEGRAM_INTEGRATION_KEY</code> no site e
            no processo do bot (<code className="rounded bg-gray-100 px-1">telegram-bot/.env</code>).
          </p>
        ) : null}
      </div>
    </div>
  );
}
