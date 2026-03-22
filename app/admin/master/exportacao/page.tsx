'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

async function downloadExport(type: 'orders' | 'users', format: 'json' | 'csv') {
  const res = await fetch(
    `/api/admin/master/export?type=${encodeURIComponent(type)}&format=${encodeURIComponent(format)}`,
    { credentials: 'include' }
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(typeof j.error === 'string' ? j.error : `Erro ${res.status}`);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  const match = cd?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `macofel-${type}-${Date.now()}.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MasterExportacaoPage() {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, type: 'orders' | 'users', format: 'json' | 'csv') => {
    setBusy(key);
    try {
      await downloadExport(type, format);
      toast.success('Download iniciado');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Falha na exportação');
    } finally {
      setBusy(null);
    }
  };

  const actions = [
    { key: 'users-json', label: 'Utilizadores (JSON)', type: 'users' as const, format: 'json' as const },
    { key: 'users-csv', label: 'Utilizadores (CSV)', type: 'users' as const, format: 'csv' as const },
    { key: 'orders-json', label: 'Pedidos (JSON)', type: 'orders' as const, format: 'json' as const },
    { key: 'orders-csv', label: 'Pedidos (CSV)', type: 'orders' as const, format: 'csv' as const },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Download className="h-8 w-8 text-amber-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Exportação de dados</h1>
          <p className="text-sm text-gray-600">
            Até 8000 linhas por ficheiro. Cada download regista{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">export.generated</code> na auditoria.
          </p>
        </div>
      </div>

      <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
        {actions.map((a) => (
          <Button
            key={a.key}
            type="button"
            variant="outline"
            className="h-auto justify-start gap-2 py-4 text-left"
            disabled={busy !== null}
            onClick={() => void run(a.key, a.type, a.format)}
          >
            {busy === a.key ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <Download className="h-5 w-5 shrink-0 text-amber-600" />
            )}
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
