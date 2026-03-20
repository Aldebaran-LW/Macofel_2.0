'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Send, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  computeQuoteProposalTotals,
  type QuoteProposalStored,
} from '@/lib/quote-proposal-totals';

type Item = {
  productId: string;
  name: string;
  slug?: string;
  quantity: number;
  price?: number;
};

type Doc = {
  id: string;
  userName: string;
  userEmail: string;
  message: string | null;
  items: Item[];
  status: string;
  shippingCep?: string | null;
  shippingCityState?: string | null;
  requestShippingQuote?: boolean;
  requestPixDiscount?: boolean;
  proposal: QuoteProposalStored | null;
  proposalSentAt: string | null;
  clientDecision: 'pending' | 'accepted' | 'rejected' | null;
  clientDecidedAt: string | null;
  linkedOrderId?: string | null;
};

const emptyProposal = (): QuoteProposalStored => ({
  freightValue: 0,
  pixDiscountType: 'none',
  pixDiscountValue: 0,
  installmentMax: 12,
  installmentInterestMonthlyPercent: 0,
  installmentNotes: null,
  messageToClient: null,
});

export default function AdminSolicitacaoDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [proposal, setProposal] = useState<QuoteProposalStored>(emptyProposal());
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quote-requests/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar');
      setDoc(data);
      setProposal(data.proposal ? { ...data.proposal } : emptyProposal());
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () => computeQuoteProposalTotals(doc?.items ?? [], proposal),
    [doc?.items, proposal]
  );

  const payload = () => ({
    freightValue: proposal.freightValue,
    pixDiscountType: proposal.pixDiscountType,
    pixDiscountValue: proposal.pixDiscountValue,
    installmentMax: proposal.installmentMax,
    installmentInterestMonthlyPercent: proposal.installmentInterestMonthlyPercent,
    installmentNotes: proposal.installmentNotes || null,
    messageToClient: proposal.messageToClient || null,
  });

  const saveDraft = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/quote-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveProposalDraft: true, proposal: payload() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar');
      toast.success('Rascunho salvo');
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const sendToClient = async () => {
    if (!confirm('Enviar esta proposta ao cliente? Ele poderá aprovar ou recusar no site.')) return;
    try {
      setSending(true);
      const res = await fetch(`/api/quote-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendProposalToClient: true, proposal: payload() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar');
      toast.success('Proposta enviada ao cliente');
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
    } finally {
      setSending(false);
    }
  };

  if (loading || !doc) {
    return (
      <div className="flex justify-center py-16">
        {loading ? <Loader2 className="h-10 w-10 animate-spin text-red-600" /> : <p>Não encontrado.</p>}
      </div>
    );
  }

  const clientLabel =
    doc.clientDecision === 'accepted'
      ? 'Cliente aceitou'
      : doc.clientDecision === 'rejected'
        ? 'Cliente recusou'
        : doc.proposalSentAt
          ? 'Aguardando cliente'
          : 'Proposta ainda não enviada';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/solicitacoes-orcamento"
          className="inline-flex items-center text-sm text-gray-600 hover:text-red-600"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Proposta comercial</h1>
        <p className="text-gray-600 text-sm mt-1">
          {doc.userName} · {doc.userEmail}
        </p>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2 inline-block">
          {clientLabel}
          {doc.clientDecidedAt ? ` · ${new Date(doc.clientDecidedAt).toLocaleString('pt-BR')}` : ''}
        </p>
        {doc.linkedOrderId ? (
          <p className="text-sm mt-3">
            <span className="text-gray-600">Pedido gerado: </span>
            <Link
              href="/admin/pedidos"
              className="font-semibold text-red-600 hover:underline"
            >
              #{doc.linkedOrderId.slice(0, 8)}… — ver em Pedidos
            </Link>
          </p>
        ) : null}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold mb-2">Itens solicitados</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          {doc.items.map((it, i) => (
            <li key={i}>
              {it.name} × {it.quantity}
              {it.price != null ? ` — ref. R$ ${Number(it.price).toFixed(2)} un.` : ''}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Subtotal catálogo: <strong>R$ {totals.subtotal.toFixed(2)}</strong>
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-lg">Valores da proposta</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Frete (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={proposal.freightValue || ''}
              onChange={(e) =>
                setProposal((p) => ({ ...p, freightValue: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Desconto PIX / à vista</Label>
            <div className="flex flex-wrap gap-3 items-end">
              <Select
                value={proposal.pixDiscountType}
                onValueChange={(v: 'none' | 'fixed' | 'percent') =>
                  setProposal((p) => ({ ...p, pixDiscountType: v }))
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem desconto</SelectItem>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
              {proposal.pixDiscountType !== 'none' && (
                <Input
                  type="number"
                  min={0}
                  step={proposal.pixDiscountType === 'percent' ? '0.1' : '0.01'}
                  className="w-40"
                  placeholder={proposal.pixDiscountType === 'percent' ? '%' : 'R$'}
                  value={proposal.pixDiscountValue || ''}
                  onChange={(e) =>
                    setProposal((p) => ({ ...p, pixDiscountValue: Number(e.target.value) || 0 }))
                  }
                />
              )}
            </div>
            <p className="text-xs text-gray-500">
              O desconto incide sobre o subtotal dos produtos; o frete é somado depois.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Parcelamento — até quantas vezes</Label>
            <Input
              type="number"
              min={1}
              max={48}
              value={proposal.installmentMax}
              onChange={(e) =>
                setProposal((p) => ({
                  ...p,
                  installmentMax: Math.min(48, Math.max(1, parseInt(e.target.value, 10) || 1)),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Juros do parcelamento (% ao mês)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={proposal.installmentInterestMonthlyPercent || ''}
              onChange={(e) =>
                setProposal((p) => ({
                  ...p,
                  installmentInterestMonthlyPercent: Number(e.target.value) || 0,
                }))
              }
            />
            <p className="text-xs text-gray-500">
              Informe o percentual mensal cobrado nas parcelas (ex.: taxa da operadora).
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Observações sobre parcelamento (opcional)</Label>
          <Textarea
            rows={2}
            placeholder="Ex.: 12x no cartão com juros; boleto sem acréscimo até 3x…"
            value={proposal.installmentNotes ?? ''}
            onChange={(e) =>
              setProposal((p) => ({ ...p, installmentNotes: e.target.value || null }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Mensagem ao cliente (opcional)</Label>
          <Textarea
            rows={3}
            placeholder="Texto que aparece junto à proposta no painel do cliente…"
            value={proposal.messageToClient ?? ''}
            onChange={(e) =>
              setProposal((p) => ({ ...p, messageToClient: e.target.value || null }))
            }
          />
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
          <p>
            <span className="text-gray-500">Subtotal produtos:</span>{' '}
            <strong>R$ {totals.subtotal.toFixed(2)}</strong>
          </p>
          {totals.discountPix > 0 && (
            <p>
              <span className="text-gray-500">Desconto PIX / à vista:</span>{' '}
              <strong>− R$ {totals.discountPix.toFixed(2)}</strong>
            </p>
          )}
          <p>
            <span className="text-gray-500">Frete:</span>{' '}
            <strong>R$ {totals.freight.toFixed(2)}</strong>
          </p>
          <p className="text-base pt-2 border-t border-slate-200">
            <span className="text-gray-500">Total estimado (PIX / à vista):</span>{' '}
            <strong className="text-red-600">R$ {totals.totalPix.toFixed(2)}</strong>
          </p>
          <p className="text-xs text-gray-500 pt-1">
            Parcelado: até {proposal.installmentMax}x com {proposal.installmentInterestMonthlyPercent}% a.m.
            sobre o parcelamento (valor da parcela depende da operadora; detalhar nas observações).
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={saving} onClick={() => void saveDraft()}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={sending}
            onClick={() => void sendToClient()}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Enviando…' : 'Enviar proposta ao cliente'}
          </Button>
        </div>
      </div>
    </div>
  );
}
