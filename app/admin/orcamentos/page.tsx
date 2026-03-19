'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Pencil, Search as SearchIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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

type OrcamentoListItem = {
  id: string;
  clienteNome: string;
  total: number;
  createdAt: string | null;
  itens: Array<any>;
};

export default function OrcamentosSavedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orcamentos, setOrcamentos] = useState<OrcamentoListItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [page, search]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const res = await fetch(`/api/orcamentos?${query}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? 'Erro ao carregar orçamentos');
        }
        const data = await res.json();
        if (cancelled) return;
        setOrcamentos(data?.orcamentos ?? []);
        setTotalPages(data?.pagination?.totalPages ?? 1);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message ?? 'Erro ao carregar orçamentos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleDeleteOrcamento = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/orcamentos/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? 'Erro ao excluir');
      }
      toast.success('Orçamento excluído');
      setDeleteId(null);
      const resList = await fetch(`/api/orcamentos?${query}`);
      if (resList.ok) {
        const data = await resList.json();
        setOrcamentos(data?.orcamentos ?? []);
        setTotalPages(data?.pagination?.totalPages ?? 1);
      } else {
        setOrcamentos((prev) => prev.filter((o) => o.id !== deleteId));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orçamentos salvos</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Buscar por cliente..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
      ) : orcamentos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center text-center">
          <FileText className="h-14 w-14 text-gray-300 mb-3" />
          <div className="font-semibold mb-1">Nenhum orçamento salvo</div>
          <div className="text-sm text-gray-500">
            Salve um orçamento em <button className="underline" onClick={() => router.push('/admin/orcamento')}>Orçamento</button>.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  O orçamento será removido permanentemente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleting}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleDeleteOrcamento();
                  }}
                >
                  {deleting ? 'Excluindo…' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Itens</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((o) => {
                  const date = o.createdAt ? new Date(o.createdAt) : null;
                  return (
                    <tr key={o.id} className="border-b">
                      <td className="px-4 py-3">{o.clienteNome}</td>
                      <td className="px-4 py-3">{o.itens?.length ?? 0}</td>
                      <td className="px-4 py-3 text-right font-semibold">R$ {Number(o.total ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {date ? date.toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Link href={`/admin/orcamentos/${o.id}`}>
                            <Button size="sm" variant="outline">Abrir</Button>
                          </Link>
                          <Link href={`/admin/orcamentos/${o.id}?edit=1`}>
                            <Button size="sm" variant="secondary">
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteId(o.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex items-center justify-between border-t">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <div className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </div>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

