'use client';

import { useCallback, useEffect, useState } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type SettingsShape = {
  tax_default_percent: number;
  devnota_enabled: boolean;
  pdv_notes: string;
};

const empty: SettingsShape = {
  tax_default_percent: 0,
  devnota_enabled: false,
  pdv_notes: '',
};

export default function MasterConfigPage() {
  const [form, setForm] = useState<SettingsShape>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/master/settings', { cache: 'no-store' });
      if (!res.ok) {
        toast.error('Não foi possível carregar as configurações');
        return;
      }
      const data = await res.json();
      setForm({
        tax_default_percent:
          typeof data.tax_default_percent === 'number' ? data.tax_default_percent : 0,
        devnota_enabled: Boolean(data.devnota_enabled),
        pdv_notes: typeof data.pdv_notes === 'string' ? data.pdv_notes : '',
      });
    } catch {
      toast.error('Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/master/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_default_percent: form.tax_default_percent,
          devnota_enabled: form.devnota_enabled,
          pdv_notes: form.pdv_notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao guardar');
        return;
      }
      if (data.settings) {
        setForm({
          tax_default_percent:
            typeof data.settings.tax_default_percent === 'number'
              ? data.settings.tax_default_percent
              : form.tax_default_percent,
          devnota_enabled: Boolean(data.settings.devnota_enabled),
          pdv_notes:
            typeof data.settings.pdv_notes === 'string' ? data.settings.pdv_notes : form.pdv_notes,
        });
      }
      toast.success('Configurações guardadas');
    } catch {
      toast.error('Erro de rede');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Configurações globais</h1>
            <p className="text-sm text-gray-600">
              Valores em Postgres (<code className="rounded bg-gray-100 px-1 text-xs">app_settings</code>).
              Chaves sensíveis (API secrets) devem continuar em variáveis de ambiente.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Recarregar
        </Button>
      </div>

      <div className="max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="tax">Taxa padrão (%)</Label>
              <Input
                id="tax"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.tax_default_percent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tax_default_percent: parseFloat(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-gray-500">Referência para cálculos no site/PDV (0–100).</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="devnota"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={form.devnota_enabled}
                onChange={(e) => setForm((f) => ({ ...f, devnota_enabled: e.target.checked }))}
              />
              <Label htmlFor="devnota" className="cursor-pointer font-normal">
                Integração DevNota ativa
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdv_notes">Notas / parâmetros PDV (texto livre)</Label>
              <textarea
                id="pdv_notes"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.pdv_notes}
                onChange={(e) => setForm((f) => ({ ...f, pdv_notes: e.target.value }))}
                placeholder="Ex.: ID do estabelecimento, observações para operadores…"
                maxLength={4000}
              />
            </div>

            <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'A guardar…' : 'Guardar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
