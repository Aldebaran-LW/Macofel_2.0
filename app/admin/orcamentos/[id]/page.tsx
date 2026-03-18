'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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

export default function OrcamentoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [orcamento, setOrcamento] = useState<OrcamentoDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/orcamentos/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? 'Erro ao carregar orçamento');
        }
        const data = await res.json();
        if (cancelled) return;
        setOrcamento(data);
      } catch (e: any) {
        console.error(e);
        if (cancelled) return;
        setError(e?.message ?? 'Erro ao carregar orçamento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orçamento</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/orcamentos">
            <Button variant="outline" className="border-gray-200">
              Voltar
            </Button>
          </Link>
          <Button onClick={gerarPDF} className="bg-red-600 hover:bg-red-700">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

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
                  {orcamento.descontoTipo === 'percentual' ? `${orcamento.descontoRaw}%` : `R$ ${orcamento.descontoRaw.toFixed(2)}`}
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
    </div>
  );
}

