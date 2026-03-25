'use client';

import { useEffect, useMemo, useState } from 'react';
import StockSubnav from '@/components/stock-subnav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type ProductLite = { id: string; name: string; stock: number };
type Movement = {
  id: string;
  productId: string;
  productName: string;
  type: 'entrada' | 'saida';
  quantity: number;
  note?: string | null;
  createdAt: string;
};

export default function MasterAdminEstoqueMovimentacoesPage() {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productId, setProductId] = useState('');
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );

  async function loadAll() {
    setLoading(true);
    try {
      const [pRes, hRes] = await Promise.all([
        fetch('/api/products?limit=500'),
        fetch('/api/admin/stock/movements?limit=50'),
      ]);
      if (!pRes.ok) throw new Error('Falha ao carregar produtos');
      if (!hRes.ok) throw new Error('Falha ao carregar histórico');

      const pData = await pRes.json();
      const list = Array.isArray(pData?.products) ? pData.products : [];
      setProducts(
        list.map((p: any) => ({ id: String(p.id), name: String(p.name), stock: Number(p.stock ?? 0) }))
      );

      const hData = await hRes.json();
      setHistory(Array.isArray(hData?.items) ? hData.items : []);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function submit() {
    const q = Number(quantity);
    if (!productId) return toast.error('Selecione um produto');
    if (!Number.isFinite(q) || q <= 0) return toast.error('Quantidade inválida');

    setSaving(true);
    try {
      const res = await fetch('/api/admin/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          type,
          quantity: q,
          note: note?.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Falha ao registrar movimentação');

      toast.success('Movimentação registrada');
      setQuantity('');
      setNote('');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Movimentações de estoque</h1>
        <p className="text-gray-600 mt-1">Entradas e saídas manuais (não substitui as baixas do PDV).</p>
      </div>

      <StockSubnav baseHref="/admin/master/estoque" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-lg font-semibold">Registrar movimentação</h2>
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Produto</div>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (Estoque: {p.stock})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedProduct ? (
                <div className="mt-1 text-xs text-gray-500">
                  Estoque atual: <span className="font-semibold text-gray-900">{selectedProduct.stock}</span>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium mb-1">Tipo</div>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Quantidade</div>
                <Input
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 3"
                />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Observação</div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Opcional" />
            </div>

            <Button className="w-full" onClick={() => void submit()} disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold">Histórico recente</h2>
          {loading ? (
            <div className="py-10 text-center text-gray-600">Carregando...</div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-gray-600">Nenhuma movimentação registrada.</div>
          ) : (
            <div className="mt-4 divide-y">
              {history.map((m) => (
                <div key={m.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{m.productName}</div>
                    <div className="text-sm text-gray-600">
                      {m.type === 'entrada' ? 'Entrada' : 'Saída'} · <span className="font-semibold">{m.quantity}</span>
                      {m.note ? ` · ${m.note}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 shrink-0">{new Date(m.createdAt).toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

