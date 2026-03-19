'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Download, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type OrcamentoDoc = {
  id: string;
  clienteNome: string;
  clienteEmail: string | null;
  clienteTelefone: string | null;
  observacoes: string | null;
  itens: Array<{
    produto: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }>;
  subtotal: number;
  freteValor: number;
  descontoTipo: 'reais' | 'percentual';
  descontoRaw: number;
  descontoValor: number;
  total: number;
  createdAt: string | null;
};

type EditableItem = {
  key: string;
  produto: string;
  quantidade: number;
  precoUnitario: number;
};

function calcDescontoValor(subtotal: number, tipo: 'reais' | 'percentual', raw: number) {
  if (tipo === 'percentual') {
    const pct = Math.max(0, raw);
    const d = (pct / 100) * subtotal;
    return Math.min(subtotal, d);
  }
  return Math.min(subtotal, Math.max(0, raw));
}

export default function OrcamentoDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [orcamento, setOrcamento] = useState<OrcamentoDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [freteStr, setFreteStr] = useState('');
  const [descontoStr, setDescontoStr] = useState('');
  const [descontoTipoEdit, setDescontoTipoEdit] = useState<'reais' | 'percentual'>('reais');
  const [editItems, setEditItems] = useState<EditableItem[]>([]);

  const editOpenedFromQuery = useRef(false);

  const loadOrcamento = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/orcamentos/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? 'Erro ao carregar orçamento');
      }
      const data = await res.json();
      setOrcamento(data);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrcamento();
  }, [loadOrcamento]);

  const hydrateEditForm = useCallback((o: OrcamentoDoc) => {
    setClienteNome(o.clienteNome);
    setClienteEmail(o.clienteEmail ?? '');
    setClienteTelefone(o.clienteTelefone ?? '');
    setObservacoes(o.observacoes ?? '');
    setFreteStr(String(o.freteValor ?? 0));
    setDescontoStr(String(o.descontoRaw ?? 0));
    setDescontoTipoEdit(o.descontoTipo === 'percentual' ? 'percentual' : 'reais');
    setEditItems(
      (o.itens ?? []).map((it, i) => ({
        key: `row-${i}-${Date.now()}`,
        produto: it.produto,
        quantidade: it.quantidade,
        precoUnitario: it.precoUnitario,
      }))
    );
  }, []);

  useEffect(() => {
    if (!orcamento || editOpenedFromQuery.current) return;
    if (searchParams?.get('edit') === '1') {
      hydrateEditForm(orcamento);
      setEditing(true);
      editOpenedFromQuery.current = true;
    }
  }, [orcamento, searchParams, hydrateEditForm]);

  const subtotalItens = () =>
    editItems.reduce((acc, it) => acc + Math.max(0, it.quantidade) * Math.max(0, it.precoUnitario), 0);

  const valorFrete = () => parseFloat(freteStr.replace(',', '.')) || 0;
  const valorDesconto = () => {
    const sub = subtotalItens();
    const raw = parseFloat(descontoStr.replace(',', '.')) || 0;
    return calcDescontoValor(sub, descontoTipoEdit, raw);
  };

  const totalEdit = () => Math.max(0, subtotalItens() + valorFrete() - valorDesconto());

  const startEdit = () => {
    if (!orcamento) return;
    hydrateEditForm(orcamento);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const updateItem = (key: string, patch: Partial<EditableItem>) => {
    setEditItems((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };

  const removeItem = (key: string) => {
    setEditItems((rows) => rows.filter((r) => r.key !== key));
  };

  const addItemRow = () => {
    setEditItems((rows) => [
      ...rows,
      { key: `new-${Date.now()}`, produto: '', quantidade: 1, precoUnitario: 0 },
    ]);
  };

  const saveEdit = async () => {
    if (!id || !orcamento) return;
    if (!clienteNome.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    if (editItems.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }
    for (const it of editItems) {
      if (!it.produto.trim()) {
        toast.error('Preencha o nome de todos os produtos');
        return;
      }
    }

    const subtotal = subtotalItens();
    const freteValor = valorFrete();
    const descontoRaw = parseFloat(descontoStr.replace(',', '.')) || 0;
    const descontoValor = valorDesconto();
    const total = totalEdit();

    const itensPayload = editItems.map((it) => ({
      produto: it.produto.trim(),
      quantidade: Math.max(1, it.quantidade),
      precoUnitario: Math.max(0, it.precoUnitario),
      subtotal: Math.max(0, it.quantidade) * Math.max(0, it.precoUnitario),
    }));

    try {
      setSaving(true);
      const res = await fetch(`/api/orcamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome: clienteNome.trim(),
          clienteEmail: clienteEmail.trim() || null,
          clienteTelefone: clienteTelefone.trim() || null,
          observacoes: observacoes.trim() || null,
          itens: itensPayload,
          subtotal,
          freteValor,
          descontoTipo: descontoTipoEdit,
          descontoRaw,
          descontoValor,
          total,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? 'Erro ao salvar');
      }

      toast.success('Orçamento atualizado');
      setEditing(false);
      await loadOrcamento();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? 'Erro ao excluir');
      }
      toast.success('Orçamento excluído');
      router.push('/admin/orcamentos');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Erro ao excluir');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const gerarPDF = () => {
    if (!orcamento) return;
    if (!orcamento.itens || orcamento.itens.length === 0) {
      toast.error('Orçamento sem itens');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Orçamento - MACOFEL</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #dc2626;
              padding-bottom: 20px;
            }
            .header h1 { color: #dc2626; margin: 0; font-size: 32px; }
            .header p { margin: 5px 0; color: #666; }
            .info-section { margin-bottom: 30px; }
            .info-section h2 {
              color: #dc2626;
              font-size: 18px;
              margin-bottom: 10px;
              border-bottom: 2px solid #eee;
              padding-bottom: 5px;
            }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th {
              background-color: #dc2626;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .total { text-align: right; margin-top: 20px; font-size: 20px; font-weight: bold; }
            .total-value { color: #dc2626; font-size: 24px; }
            .totals { text-align: right; margin-top: 20px; }
            .total-line { display: flex; justify-content: flex-end; gap: 24px; margin-bottom: 6px; font-size: 14px; }
            .observacoes { margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #dc2626; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MACOFEL</h1>
            <p>Materiais para Construção</p>
            <p>Av. São Paulo, 699 - Centro, Parapuã - SP</p>
            <p>Tel: (18) 99814-5495</p>
          </div>

          <div class="info-section">
            <h2>Dados do Cliente</h2>
            <p><strong>Nome:</strong> ${orcamento.clienteNome}</p>
            ${orcamento.clienteEmail ? `<p><strong>Email:</strong> ${orcamento.clienteEmail}</p>` : ''}
            ${orcamento.clienteTelefone ? `<p><strong>Telefone:</strong> ${orcamento.clienteTelefone}</p>` : ''}
            <p><strong>Data:</strong> ${new Date(orcamento.createdAt ?? new Date().toISOString()).toLocaleDateString('pt-BR')}</p>
          </div>

          <div class="info-section">
            <h2>Itens do Orçamento</h2>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Preço Unitário</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${orcamento.itens.map((item) => `
                  <tr>
                    <td>${item.produto}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.precoUnitario.toFixed(2)}</td>
                    <td>R$ ${item.subtotal.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="totals">
              <div class="total-line"><span>Subtotal:</span><span>R$ ${orcamento.subtotal.toFixed(2)}</span></div>
              ${orcamento.freteValor > 0 ? `<div class="total-line"><span>Frete:</span><span>R$ ${orcamento.freteValor.toFixed(2)}</span></div>` : ''}
              ${orcamento.descontoValor > 0 ? `<div class="total-line"><span>Desconto: ${orcamento.descontoTipo === 'percentual' ? (orcamento.descontoRaw + '%') : ('R$ ' + orcamento.descontoRaw.toFixed(2))}</span><span>- R$ ${orcamento.descontoValor.toFixed(2)}</span></div>` : ''}
              <div class="total">
                <span>Total: <span class="total-value">R$ ${orcamento.total.toFixed(2)}</span></span>
              </div>
            </div>
          </div>

          ${orcamento.observacoes ? `
            <div class="observacoes">
              <strong>Observações:</strong>
              <p>${orcamento.observacoes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Este orçamento é válido por 30 dias a partir da data de emissão.</p>
            <p>MACOFEL - Materiais para Construção | CNPJ: XX.XXX.XXX/XXXX-XX</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permissão para abrir janela negada. Permita pop-ups e tente novamente.');
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <div className="text-red-600 font-semibold">Erro: {error}</div>
        <Link href="/admin/orcamentos" className="underline text-sm">
          Voltar para orçamentos salvos
        </Link>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="space-y-4 p-6">
        <div className="text-gray-600 font-semibold">Orçamento não encontrado</div>
        <Link href="/admin/orcamentos" className="underline text-sm">
          Voltar para orçamentos salvos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-3xl font-bold">Orçamento</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/orcamentos">
            <Button variant="outline" className="border-gray-200">
              Voltar
            </Button>
          </Link>
          {!editing && (
            <>
              <Button variant="outline" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <Button onClick={gerarPDF} className="bg-red-600 hover:bg-red-700">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={() => void saveEdit()} disabled={saving} className="bg-red-600 hover:bg-red-700">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O orçamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold">Dados do cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} type="email" />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Itens</h2>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                <Plus className="h-4 w-4 mr-1" />
                Linha
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2 text-left">Produto</th>
                    <th className="px-2 py-2 text-center w-24">Qtd</th>
                    <th className="px-2 py-2 text-right w-32">Preço unit.</th>
                    <th className="px-2 py-2 text-right w-28">Subtotal</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((row) => {
                    const sub = Math.max(0, row.quantidade) * Math.max(0, row.precoUnitario);
                    return (
                      <tr key={row.key} className="border-b">
                        <td className="px-2 py-2">
                          <Input
                            value={row.produto}
                            onChange={(e) => updateItem(row.key, { produto: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={row.quantidade}
                            onChange={(e) =>
                              updateItem(row.key, { quantidade: Math.max(1, parseInt(e.target.value, 10) || 1) })
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.precoUnitario}
                            onChange={(e) =>
                              updateItem(row.key, {
                                precoUnitario: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium">R$ {sub.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(row.key)}
                            aria-label="Remover linha"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium">Frete (R$)</label>
                <Input value={freteStr} onChange={(e) => setFreteStr(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo desconto</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={descontoTipoEdit}
                  onChange={(e) => setDescontoTipoEdit(e.target.value as 'reais' | 'percentual')}
                >
                  <option value="reais">Reais (R$)</option>
                  <option value="percentual">Percentual (%)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {descontoTipoEdit === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
                </label>
                <Input value={descontoStr} onChange={(e) => setDescontoStr(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-6 text-sm border-t pt-4">
              <span>Subtotal itens: <strong>R$ {subtotalItens().toFixed(2)}</strong></span>
              <span>Frete: <strong>R$ {valorFrete().toFixed(2)}</strong></span>
              <span>Desconto: <strong>R$ {valorDesconto().toFixed(2)}</strong></span>
              <span className="text-lg">
                Total: <strong className="text-red-600">R$ {totalEdit().toFixed(2)}</strong>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Dados do Cliente</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <span className="font-semibold">Nome:</span> {orcamento.clienteNome}
                </div>
                {orcamento.clienteEmail && (
                  <div>
                    <span className="font-semibold">Email:</span> {orcamento.clienteEmail}
                  </div>
                )}
                {orcamento.clienteTelefone && (
                  <div>
                    <span className="font-semibold">Telefone:</span> {orcamento.clienteTelefone}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Data:</span>{' '}
                  {orcamento.createdAt ? new Date(orcamento.createdAt).toLocaleDateString('pt-BR') : '-'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Observações</h2>
              <div className="text-sm text-gray-700">{orcamento.observacoes || '-'}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Itens</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium">Produto</th>
                    <th className="px-4 py-2 text-center text-sm font-medium">Qtd</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Preço Unit.</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamento.itens.map((it, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2">{it.produto}</td>
                      <td className="px-4 py-2 text-center">{it.quantidade}</td>
                      <td className="px-4 py-2 text-right">R$ {it.precoUnitario.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-medium">R$ {it.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>R$ {orcamento.subtotal.toFixed(2)}</span>
              </div>
              {orcamento.freteValor > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Frete:</span>
                  <span>R$ {orcamento.freteValor.toFixed(2)}</span>
                </div>
              )}
              {orcamento.descontoValor > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    Desconto:{' '}
                    {orcamento.descontoTipo === 'percentual'
                      ? `${orcamento.descontoRaw}%`
                      : `R$ ${orcamento.descontoRaw.toFixed(2)}`}
                  </span>
                  <span>- R$ {orcamento.descontoValor.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-red-600">R$ {orcamento.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!editing && (
        <div className="bg-slate-950 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-3">Precisa de mais?</p>
            <h3 className="text-2xl font-black text-white italic">Explore o Catálogo Completo</h3>
          </div>
          <Link
            href="/catalogo"
            className="shrink-0 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-2xl transition-all text-sm uppercase tracking-wider"
          >
            Ver Todos os Produtos
          </Link>
        </div>
      )}
    </div>
  );
}
