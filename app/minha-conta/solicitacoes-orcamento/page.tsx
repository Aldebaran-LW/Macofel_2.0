'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ClipboardList, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Solicitacao = {
  id: string;
  message: string | null;
  items: Array<{ name: string; quantity: number; price?: number }>;
  status: string;
  createdAt: string | null;
};

const statusLabels: Record<string, string> = {
  pending: 'Em análise',
  viewed: 'Visualizado pela loja',
  answered: 'Respondido',
  archived: 'Arquivado',
};

export default function MinhasSolicitacoesPage() {
  const { status } = useSession() ?? {};
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Solicitacao[]>([]);

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
            Envie itens do carrinho para receber um orçamento da MACOFEL.
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
        <ul className="space-y-4">
          {list.map((s) => (
            <li key={s.id} className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <span className="text-xs text-gray-500">
                  {s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR') : ''}
                </span>
                <span className="text-sm font-semibold text-emerald-700">
                  {statusLabels[s.status] ?? s.status}
                </span>
              </div>
              {s.message && <p className="text-sm text-gray-700 mb-2">{s.message}</p>}
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                {s.items.map((it, i) => (
                  <li key={i}>
                    {it.name} × {it.quantity}
                    {it.price != null ? ` (ref. R$ ${Number(it.price).toFixed(2)})` : ''}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
