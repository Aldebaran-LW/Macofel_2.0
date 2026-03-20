'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ClipboardList, ShoppingCart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  computeQuoteProposalTotals,
  type QuoteProposalStored,
} from '@/lib/quote-proposal-totals';

const WHATSAPP_E164 = '5518998145495';

function waUrl(message: string) {
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

type Item = { name: string; quantity: number; price?: number };

type Solicitacao = {
  id: string;
  message: string | null;
  items: Item[];
  status: string;
  createdAt: string | null;
  shippingCep?: string | null;
  shippingCityState?: string | null;
  requestShippingQuote?: boolean;
  requestPixDiscount?: boolean;
  proposal: QuoteProposalStored | null;
  proposalSentAt: string | null;
  clientDecision: 'pending' | 'accepted' | 'rejected' | null;
  clientDecidedAt: string | null;
};

const statusLabels: Record<string, string> = {
  pending: 'Em análise',
  viewed: 'Visualizado pela loja',
  answered: 'Respondido',
  archived: 'Arquivado',
};

function formatCep(cep: string | null | undefined): string {
  if (!cep) return '';
  const d = String(cep).replace(/\D/g, '');
  if (d.length !== 8) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function pixLabel(p: QuoteProposalStored): string {
  if (p.pixDiscountType === 'percent' && p.pixDiscountValue > 0) {
    return `${p.pixDiscountValue}% sobre os produtos`;
  }
  if (p.pixDiscountType === 'fixed' && p.pixDiscountValue > 0) {
    return `R$ ${p.pixDiscountValue.toFixed(2)} sobre os produtos`;
  }
  return 'Sem desconto informado';
}

export default function MinhasSolicitacoesPage() {
  const { status } = useSession() ?? {};
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Solicitacao[]>([]);
  const [deciding, setDeciding] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let c = false;
    async function run() {
      try {
        const res = await fetch('/api/quote-requests', { credentials: 'include' });
        if (!res.ok) throw new Error('Erro ao carregar');
        const data = await res.json();
        if (!c) setList(data?.solicitacoes ?? []);
      } catch {
        if (!c) toast.error('Não foi possível carregar suas solicitações');
      } finally {
        if (!c) setLoading(false);
      }
    }
    void run();
    return () => {
      c = true;
    };
  }, [status]);

  const submitDecision = async (id: string, decision: 'accepted' | 'rejected') => {
    try {
      setDeciding(id + decision);
      const res = await fetch(`/api/quote-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientDecision: decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar resposta');
      toast.success(decision === 'accepted' ? 'Proposta aceita! A loja entrará em contato.' : 'Resposta registrada.');
      setList((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, clientDecision: decision, clientDecidedAt: new Date().toISOString() }
            : s
        )
      );
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
    } finally {
      setDeciding(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-red-600" />
            Solicitações de orçamento
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Quando a MACOFEL enviar valores (frete, PIX, parcelas), você aprova ou recusa aqui. Dúvidas:
            fale pelo WhatsApp.
          </p>
        </div>
        <Link href="/carrinho">
          <Button className="bg-red-600 hover:bg-red-700">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Ir ao carrinho
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-600">
          <p className="mb-4">Você ainda não enviou nenhuma solicitação.</p>
          <Link href="/carrinho" className="text-red-600 font-semibold hover:underline">
            Monte seu carrinho e clique em “Solicitar orçamento”
          </Link>
        </div>
      ) : (
        <ul className="space-y-6">
          {list.map((s) => {
            const totals =
              s.proposal && s.proposalSentAt
                ? computeQuoteProposalTotals(s.items, s.proposal)
                : null;
            const doubtMsg = `Olá! Tenho dúvidas sobre meu orçamento (ref. ${s.id.slice(-8)}). Podem me ajudar?`;

            return (
              <li key={s.id} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR') : ''}
                  </span>
                  <span className="text-sm font-semibold text-emerald-800">
                    {statusLabels[s.status] ?? s.status}
                  </span>
                </div>

                {(s.requestShippingQuote || s.requestPixDiscount) && !s.proposalSentAt && (
                  <ul className="text-xs text-gray-600 space-y-1 bg-slate-50 rounded p-2">
                    {s.requestShippingQuote && (
                      <li>
                        Pediu <strong>frete / envio</strong>
                        {formatCep(s.shippingCep) ? ` — CEP ${formatCep(s.shippingCep)}` : ''}
                        {s.shippingCityState ? ` · ${s.shippingCityState}` : ''}
                      </li>
                    )}
                    {s.requestPixDiscount && (
                      <li>
                        Pediu informações sobre <strong>desconto</strong> (ex.: PIX)
                      </li>
                    )}
                  </ul>
                )}

                {!s.proposalSentAt && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                    Aguardando a loja montar e enviar a proposta com frete, condições de PIX e parcelamento.
                  </p>
                )}

                {s.proposalSentAt && s.proposal && totals && (
                  <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4 space-y-3">
                    <h3 className="font-bold text-emerald-900">Proposta da MACOFEL</h3>
                    {s.proposal.messageToClient && (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{s.proposal.messageToClient}</p>
                    )}
                    <ul className="text-sm space-y-2 text-gray-800">
                      <li>
                        <strong>Frete:</strong> R$ {s.proposal.freightValue.toFixed(2)}
                      </li>
                      <li>
                        <strong>Desconto PIX / à vista:</strong> {pixLabel(s.proposal)}
                      </li>
                      <li>
                        <strong>Parcelamento:</strong> até{' '}
                        <strong>{s.proposal.installmentMax}x</strong>
                        {s.proposal.installmentInterestMonthlyPercent > 0 ? (
                          <>
                            {' '}
                            — juros de{' '}
                            <strong>{s.proposal.installmentInterestMonthlyPercent}% ao mês</strong> sobre o
                            parcelamento
                          </>
                        ) : (
                          <> — sem juros informados (consulte observações)</>
                        )}
                      </li>
                      {s.proposal.installmentNotes && (
                        <li className="text-gray-700">
                          <strong>Obs. parcelas:</strong> {s.proposal.installmentNotes}
                        </li>
                      )}
                    </ul>
                    <div className="text-sm border-t border-emerald-200 pt-3 space-y-1">
                      <p>
                        Subtotal produtos: <strong>R$ {totals.subtotal.toFixed(2)}</strong>
                      </p>
                      {totals.discountPix > 0 && (
                        <p>
                          Desconto PIX/à vista: <strong>− R$ {totals.discountPix.toFixed(2)}</strong>
                        </p>
                      )}
                      <p>
                        Frete: <strong>R$ {totals.freight.toFixed(2)}</strong>
                      </p>
                      <p className="text-lg font-bold text-red-600 pt-1">
                        Total estimado (PIX / à vista): R$ {totals.totalPix.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Valores de parcelas com juros dependem da operadora — em caso de dúvida, use o WhatsApp.
                      </p>
                    </div>

                    {s.clientDecision === 'pending' || !s.clientDecision ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={!!deciding}
                          onClick={() => void submitDecision(s.id, 'accepted')}
                        >
                          {deciding === s.id + 'accepted' ? 'Enviando…' : 'Aceito a proposta'}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-300 text-red-700"
                          disabled={!!deciding}
                          onClick={() => void submitDecision(s.id, 'rejected')}
                        >
                          {deciding === s.id + 'rejected' ? 'Enviando…' : 'Não aceito'}
                        </Button>
                        <a
                          href={waUrl(doubtMsg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-700 font-medium hover:underline ml-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Tirar dúvidas no WhatsApp
                        </a>
                      </div>
                    ) : s.clientDecision === 'accepted' ? (
                      <p className="text-sm font-semibold text-green-800 pt-2">
                        Você aceitou esta proposta em{' '}
                        {s.clientDecidedAt
                          ? new Date(s.clientDecidedAt).toLocaleString('pt-BR')
                          : ''}
                        . A equipe da MACOFEL dará continuidade. Dúvidas?{' '}
                        <a
                          href={waUrl(doubtMsg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline inline-flex items-center gap-1"
                        >
                          WhatsApp
                        </a>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-700 pt-2">
                        Você indicou que não aceita esta proposta. Se quiser outro valor, envie uma nova
                        solicitação ou{' '}
                        <a
                          href={waUrl(
                            `Olá! Recusei a proposta ${s.id.slice(-8)} mas gostaria de negociar.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 font-medium underline inline-flex items-center gap-1"
                        >
                          <MessageCircle className="h-4 w-4" />
                          fale conosco no WhatsApp
                        </a>
                        .
                      </p>
                    )}
                  </div>
                )}

                {s.message && <p className="text-sm text-gray-700">{s.message}</p>}
                <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                  {s.items.map((it, i) => (
                    <li key={i}>
                      {it.name} × {it.quantity}
                      {it.price != null ? ` (ref. R$ ${Number(it.price).toFixed(2)})` : ''}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
