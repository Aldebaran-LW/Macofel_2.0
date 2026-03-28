'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQuotesPortalBase } from '@/hooks/use-quotes-portal-base';

interface OrcamentoItem {
  id: string;
  produto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
}

export default function AdminOrcamentoPage() {
  const [items, setItems] = useState<OrcamentoItem[]>([]);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [frete, setFrete] = useState('');
  const [desconto, setDesconto] = useState('');
  const [descontoTipo, setDescontoTipo] = useState<'reais' | 'percentual'>('reais');
  const [produtoAtual, setProdutoAtual] = useState({ nome: '', quantidade: '1', preco: '' });

  const router = useRouter();
  const quotesBase = useQuotesPortalBase();
  const [savingOrcamento, setSavingOrcamento] = useState(false);
  const [savedOrcamentoId, setSavedOrcamentoId] = useState<string | null>(null);

  // Modal para selecionar produto e quantidade
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantidade, setModalQuantidade] = useState('1');

  const adicionarItem = (produtoNome: string, quantidade: number, precoUnitario: number) => {
    if (!produtoNome) {
      toast.error('Selecione um produto');
      return;
    }

    if (!Number.isFinite(precoUnitario) || precoUnitario < 0) {
      toast.error('Preço unitário inválido');
      return;
    }

    const safeQuantidade = Math.max(1, quantidade || 1);
    const safePrecoUnitario = precoUnitario || 0;
    const subtotal = safeQuantidade * safePrecoUnitario;

    const novoItem: OrcamentoItem = {
      id: Date.now().toString(),
      produto: produtoNome,
      quantidade: safeQuantidade,
      precoUnitario: safePrecoUnitario,
      subtotal,
    };

    setItems((prev) => [...prev, novoItem]);
    setProdutoAtual({ nome: '', quantidade: '1', preco: '' });
    toast.success('Item adicionado');
  };

  const resetModalState = () => {
    setSelectedProduct(null);
    setProductSearch('');
    setModalQuantidade('1');
    setProdutoAtual({ nome: '', quantidade: '1', preco: '' });
  };

  const fetchProductsForModal = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch('/api/products?limit=100');
      if (!res.ok) throw new Error('Falha ao carregar produtos');
      const data = await res.json();
      setProducts(data?.products ?? []);
      setProductsLoaded(true);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar produtos para seleção');
    } finally {
      setLoadingProducts(false);
    }
  };

  const openAddItemDialog = () => {
    resetModalState();
    setIsAddItemDialogOpen(true);
    if (!productsLoaded && !loadingProducts) {
      void fetchProductsForModal();
    }
  };

  const handleConfirmAddItem = () => {
    if (!selectedProduct) {
      toast.error('Selecione um produto');
      return;
    }

    const quantidade = parseFloat(modalQuantidade) || 1;

    if (selectedProduct.stock > 0 && quantidade > selectedProduct.stock) {
      toast.error(`Quantidade excede o estoque (estoque: ${selectedProduct.stock})`);
      return;
    }

    adicionarItem(selectedProduct.name, quantidade, selectedProduct.price);
    setIsAddItemDialogOpen(false);
    resetModalState();
  };

  const removerItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotalItens = () => items.reduce((total, item) => total + item.subtotal, 0);

  const valorFrete = () => parseFloat(frete.replace(',', '.')) || 0;
  const valorDesconto = () => {
    const sub = subtotalItens();
    const raw = parseFloat(desconto.replace(',', '.')) || 0;

    if (descontoTipo === 'percentual') {
      const pct = Math.max(0, raw);
      const descontoValor = (pct / 100) * sub;
      return Math.min(sub, descontoValor);
    }

    const descontoValor = Math.max(0, raw);
    return Math.min(sub, descontoValor);
  };

  const calcularTotal = () => {
    const sub = subtotalItens();
    const f = valorFrete();
    const d = valorDesconto();
    return Math.max(0, sub + f - d);
  };

  const salvarOrcamento = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento');
      return;
    }

    if (!clienteNome) {
      toast.error('Informe o nome do cliente');
      return;
    }

    try {
      setSavingOrcamento(true);

      const freteValor = valorFrete();
      const descontoValor = valorDesconto();
      const subtotal = subtotalItens();
      const total = calcularTotal();
      const descontoRaw = parseFloat(desconto.replace(',', '.')) || 0;

      const res = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome,
          clienteEmail: clienteEmail || null,
          clienteTelefone: clienteTelefone || null,
          observacoes: observacoes || null,
          itens: items,
          subtotal,
          freteValor,
          descontoTipo,
          descontoRaw,
          descontoValor,
          total,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? 'Erro ao salvar orçamento');
      }

      const data = await res.json();
      const id = data?.id as string | undefined;

      if (!id) {
        throw new Error('Resposta inválida do servidor');
      }

      setSavedOrcamentoId(id);
      toast.success('Orçamento salvo com sucesso');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? 'Erro ao salvar orçamento');
    } finally {
      setSavingOrcamento(false);
    }
  };

  const gerarPDF = () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento');
      return;
    }

    if (!clienteNome) {
      toast.error('Informe o nome do cliente');
      return;
    }

    // Criar conteúdo HTML do PDF
    const descontoRawValue = parseFloat(desconto.replace(',', '.')) || 0;
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
            .header h1 {
              color: #dc2626;
              margin: 0;
              font-size: 32px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .info-section {
              margin-bottom: 30px;
            }
            .info-section h2 {
              color: #dc2626;
              font-size: 18px;
              margin-bottom: 10px;
              border-bottom: 2px solid #eee;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #dc2626;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .total {
              text-align: right;
              margin-top: 20px;
              font-size: 20px;
              font-weight: bold;
            }
            .total-value {
              color: #dc2626;
              font-size: 24px;
            }
            .totals {
              text-align: right;
              margin-top: 20px;
            }
            .total-line {
              display: flex;
              justify-content: flex-end;
              gap: 24px;
              margin-bottom: 6px;
              font-size: 14px;
            }
            .observacoes {
              margin-top: 30px;
              padding: 15px;
              background-color: #f5f5f5;
              border-left: 4px solid #dc2626;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
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
            <p><strong>Nome:</strong> ${clienteNome}</p>
            ${clienteEmail ? `<p><strong>Email:</strong> ${clienteEmail}</p>` : ''}
            ${clienteTelefone ? `<p><strong>Telefone:</strong> ${clienteTelefone}</p>` : ''}
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
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
                ${items.map(item => `
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
              <div class="total-line"><span>Subtotal:</span><span>R$ ${subtotalItens().toFixed(2)}</span></div>
              ${valorFrete() > 0 ? `<div class="total-line"><span>Frete:</span><span>R$ ${valorFrete().toFixed(2)}</span></div>` : ''}
              ${valorDesconto() > 0 ? `<div class="total-line"><span>Desconto: ${descontoTipo === 'percentual' ? (descontoRawValue + '%') : ('R$ ' + descontoRawValue.toFixed(2))}</span><span>- R$ ${valorDesconto().toFixed(2)}</span></div>` : ''}
              <div class="total">
                <span>Total: <span class="total-value">R$ ${calcularTotal().toFixed(2)}</span></span>
              </div>
            </div>
          </div>

          ${observacoes ? `
            <div class="observacoes">
              <strong>Observações:</strong>
              <p>${observacoes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Este orçamento é válido por 30 dias a partir da data de emissão.</p>
            <p>MACOFEL - Materiais para Construção | CNPJ: XX.XXX.XXX/XXXX-XX</p>
          </div>
        </body>
      </html>
    `;

    // Criar janela para impressão
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      toast.error('Permissão para abrir janela negada. Permita pop-ups e tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orçamento</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={salvarOrcamento}
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={savingOrcamento || items.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            {savingOrcamento ? 'Salvando...' : 'Salvar Orçamento'}
          </Button>
          <Button
            onClick={gerarPDF}
            className="bg-red-600 hover:bg-red-700"
            disabled={items.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          {savedOrcamentoId && (
            <Button
              variant="outline"
              onClick={() => router.push(`${quotesBase}/orcamentos/${savedOrcamentoId}`)}
              className="border-gray-200"
            >
              Consultar/Exportar depois
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <div className="space-y-6">
          {/* Dados do Cliente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Dados do Cliente</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome completo do cliente"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <Input
                  type="tel"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* Adicionar Item */}
          <div
            className="bg-white rounded-lg shadow p-6 cursor-pointer"
            onClick={openAddItemDialog}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openAddItemDialog();
            }}
          >
            <h2 className="text-xl font-semibold mb-4">Adicionar Item</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Produto <span className="text-red-500">*</span>
                </label>
                <Input
                  value={produtoAtual.nome}
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddItemDialog();
                  }}
                  readOnly
                  placeholder="Clique para selecionar um produto"
                  className="cursor-pointer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quantidade <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={produtoAtual.quantidade}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Preço Unitário (R$) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={produtoAtual.preco}
                    disabled
                  />
                </div>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  openAddItemDialog();
                }}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>
          </div>

          {/* Modal de seleção do produto */}
          <Dialog
            open={isAddItemDialogOpen}
            onOpenChange={(open) => {
              setIsAddItemDialogOpen(open);
              if (!open) resetModalState();
            }}
          >
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Selecionar Produto</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar por nome..."
                      className="pl-9"
                    />
                  </div>

                  <div className="max-h-[320px] overflow-y-auto rounded-lg border border-gray-100">
                    {loadingProducts ? (
                      <div className="p-4 text-sm text-gray-500">Carregando produtos...</div>
                    ) : products.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">Nenhum produto encontrado.</div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {products
                          .filter((p) =>
                            p.name.toLowerCase().includes(productSearch.trim().toLowerCase())
                          )
                          .map((p) => {
                            const isSelected = selectedProduct?.id === p.id;
                            const disabled = p.stock <= 0;

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  if (disabled) {
                                    toast.error('Produto sem estoque');
                                    return;
                                  }
                                  setSelectedProduct(p);
                                  setProdutoAtual({ nome: p.name, quantidade: '1', preco: String(p.price) });
                                  setModalQuantidade('1');
                                }}
                                className={[
                                  'w-full text-left px-4 py-3 transition-colors',
                                  isSelected ? 'bg-red-50' : 'bg-white hover:bg-gray-50',
                                  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                                ].join(' ')}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="font-semibold text-sm text-gray-900 truncate">
                                      {p.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Estoque: {p.stock}
                                    </div>
                                  </div>
                                  <div className="whitespace-nowrap text-sm font-bold text-red-600">
                                    R$ {p.price.toFixed(2)}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
                  {!selectedProduct ? (
                    <div className="text-sm text-gray-600">
                      Selecione um produto na lista para definir a quantidade.
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="text-xs uppercase tracking-widest font-bold text-gray-500">
                          Produto
                        </div>
                        <div className="font-semibold text-gray-900">
                          {selectedProduct.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Preço unitário: R$ {selectedProduct.price.toFixed(2)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Quantidade <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={modalQuantidade}
                          onChange={(e) => {
                            setModalQuantidade(e.target.value);
                            setProdutoAtual((prev) => ({ ...prev, quantidade: e.target.value }));
                          }}
                        />
                        {selectedProduct.stock > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Estoque máximo: {selectedProduct.stock}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>Subtotal</span>
                          <span className="font-bold text-red-600">
                            R$
                            {(
                              (parseFloat(modalQuantidade) || 1) *
                              (selectedProduct?.price ?? 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddItemDialogOpen(false);
                        resetModalState();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmAddItem}
                      disabled={!selectedProduct}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar ao Orçamento
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="hidden" />
            </DialogContent>
          </Dialog>

          {/* Frete e Descontos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Frete e Descontos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Frete (R$)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={frete}
                  onChange={(e) => setFrete(e.target.value.replace(/[^0-9,.-]/g, ''))}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Desconto</label>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <select
                    value={descontoTipo}
                    onChange={(e) => setDescontoTipo(e.target.value as 'reais' | 'percentual')}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="reais">R$</option>
                    <option value="percentual">%</option>
                  </select>

                  <Input
                    type="text"
                    inputMode="decimal"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value.replace(/[^0-9,.-]/g, ''))}
                    placeholder={descontoTipo === 'reais' ? '0,00' : '10'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Observações</h2>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais sobre o orçamento..."
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-y"
            />
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Itens do Orçamento</h2>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Nenhum item adicionado</p>
              <p className="text-sm">Adicione itens usando o formulário ao lado</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-sm font-medium">Produto</th>
                      <th className="px-4 py-2 text-center text-sm font-medium">Qtd</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Preço Unit.</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Subtotal</th>
                      <th className="px-4 py-2 text-center text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-2">{item.produto}</td>
                        <td className="px-4 py-2 text-center">{item.quantidade}</td>
                        <td className="px-4 py-2 text-right">R$ {item.precoUnitario.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-medium">R$ {item.subtotal.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removerItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span>R$ {subtotalItens().toFixed(2)}</span>
                </div>
                {(valorFrete() > 0 || valorDesconto() > 0) && (
                  <>
                    {valorFrete() > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Frete:</span>
                        <span>R$ {valorFrete().toFixed(2)}</span>
                      </div>
                    )}
                    {valorDesconto() > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Desconto:</span>
                        <span>- R$ {valorDesconto().toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-red-600">
                    R$ {calcularTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
