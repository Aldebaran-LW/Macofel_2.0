'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { importFileTooLarge, MAX_IMPORT_FILE_DESC } from '@/lib/import-upload-limits';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  minStock?: number;
  weight?: number | null;
  imageUrl?: string | null;
  categoryId: string;
  featured: boolean;
  category: { name: string; id: string };
}

interface Category {
  id: string;
  name: string;
}

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    minStock: '',
    weight: '',
    imageUrl: '',
    categoryId: '',
    featured: false,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUpsert, setImportUpsert] = useState(true);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [importRunLoading, setImportRunLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    source: 'xls' | 'pdf';
    totalRows: number;
    sample: Array<{
      code: string;
      name: string;
      stock: number;
      price: number;
      slug: string;
      source?: 'xls' | 'pdf';
      grupo?: string;
      barcode?: string;
      status?: string;
      vendaPrazo?: number;
      custo?: number;
      sheet?: string;
      row?: number;
      line?: number;
    }>;
    warnings: string[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ name: string; message: string }>;
    warnings: string[];
  } | null>(null);
  const [importRemoteAvailable, setImportRemoteAvailable] = useState<boolean | null>(null);
  const [importRemoteLoading, setImportRemoteLoading] = useState(false);
  const [importRemoteEnrichAi, setImportRemoteEnrichAi] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/products/import/remote-available');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setImportRemoteAvailable(Boolean(data?.available));
      } catch {
        if (!cancelled) setImportRemoteAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProducts = async () => {
    try {
      // API de admin: não depende do guard do catálogo público e lista também inativos.
      const res = await fetch('/api/admin/products?limit=300', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProducts(data?.products ?? []);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('fetchProducts admin:', res.status, err);
        toast.error(err?.error || `Erro ${res.status} ao carregar produtos`);
        setProducts([]);
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data ?? []);
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };


  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      minStock: '',
      weight: '',
      imageUrl: '',
      categoryId: '',
      featured: false,
    });
    setEditingProduct(null);
    setImagePreview(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/products/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, imageUrl: data.imageUrl }));
        setImagePreview(data.imageUrl);
        toast.success('Imagem enviada com sucesso!');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao fazer upload da imagem');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        stock: product.stock.toString(),
        minStock: String(product.minStock ?? 0),
        weight: product.weight?.toString() || '',
        imageUrl: product.imageUrl || '',
        categoryId: product.categoryId,
        featured: product.featured,
      });
      setImagePreview(product.imageUrl || null);
    } else {
      resetForm();
      setImagePreview(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          stock: formData.stock || '0',
          minStock: formData.minStock || '0',
          weight: formData.weight || null,
          imageUrl: formData.imageUrl || null,
          categoryId: formData.categoryId,
          featured: formData.featured,
        }),
      });

      if (res.ok) {
        toast.success(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
        handleCloseDialog();
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao salvar produto');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar produto');
    }
  };

  const resetImportState = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportUpsert(true);
    setImportRemoteEnrichAi(false);
  };

  const handleImportPreview = async () => {
    if (!importFile) {
      toast.error('Selecione um ficheiro .xls, .xlsx ou .pdf');
      return;
    }
    setImportPreviewLoading(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch('/api/admin/products/import/preview', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro na prévia');
        return;
      }
      setImportPreview({
        source: data.source === 'pdf' ? 'pdf' : 'xls',
        totalRows: data.totalRows,
        sample: data.sample ?? [],
        warnings: data.warnings ?? [],
      });
      toast.success(`Prévia: ${data.totalRows} linha(s) reconhecida(s).`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar prévia');
    } finally {
      setImportPreviewLoading(false);
    }
  };

  const handleImportRun = async () => {
    if (!importFile) {
      toast.error('Selecione um ficheiro .xls, .xlsx ou .pdf');
      return;
    }
    setImportRunLoading(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('upsert', importUpsert ? 'true' : 'false');
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(
          [data.error, data.details].filter(Boolean).join(' — ') || 'Erro na importação'
        );
        return;
      }
      setImportResult({
        created: data.created,
        updated: data.updated,
        skipped: data.skipped,
        errors: data.errors ?? [],
        warnings: data.warnings ?? [],
      });
      const c = data.created ?? 0;
      const u = data.updated ?? 0;
      const s = data.skipped ?? 0;
      if (c + u === 0) {
        toast.warning(
          s > 0
            ? `Nenhum produto novo ou atualizado (${s} ignorados). Ative «Atualizar produtos já existentes» ou use Prévia.`
            : 'Importação terminou sem alterações (0 criados, 0 atualizados). Veja avisos abaixo no modal.'
        );
      } else {
        toast.success(`Importação: ${c} novos, ${u} atualizados, ${s} ignorados.`);
      }
      fetchProducts();
      setTimeout(() => {
        document.getElementById('importacao-resultado')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (e) {
      console.error(e);
      toast.error('Erro na importação');
    } finally {
      setImportRunLoading(false);
    }
  };

  const handleImportRemoteRun = async () => {
    if (!importFile) {
      toast.error('Selecione um ficheiro .xls ou .xlsx');
      return;
    }
    const n = importFile.name.toLowerCase();
    if (n.endsWith('.pdf')) {
      toast.error('O servidor dedicado só aceita Excel. Para PDF use a importação normal.');
      return;
    }
    if (!n.endsWith('.xls') && !n.endsWith('.xlsx')) {
      toast.error('Use .xls ou .xlsx para o servidor dedicado.');
      return;
    }
    setImportRemoteLoading(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('upsert', importUpsert ? 'true' : 'false');
      fd.append('enrich_ai', importRemoteEnrichAi ? 'true' : 'false');
      const res = await fetch('/api/admin/products/import/remote', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = data?.detail;
        const detailStr =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((x: { msg?: string }) => x?.msg).filter(Boolean).join('; ')
              : '';
        toast.error(data?.error || detailStr || 'Erro na importação remota');
        return;
      }
      const rawErrs = Array.isArray(data.errors) ? data.errors : [];
      const normErrors = rawErrs.map((e: { name?: string; message?: string; msg?: string }) => ({
        name: String(e?.name ?? '—'),
        message: String(e?.message ?? e?.msg ?? ''),
      }));
      setImportResult({
        created: data.created ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        errors: normErrors,
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
      });
      toast.success(
        `Importação (servidor dedicado): ${data.created ?? 0} novos, ${data.updated ?? 0} atualizados, ${data.skipped ?? 0} ignorados.`
      );
      fetchProducts();
    } catch (e) {
      console.error(e);
      toast.error('Erro na importação remota');
    } finally {
      setImportRemoteLoading(false);
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Tem certeza que deseja deletar "${productName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Produto deletado!');
        fetchProducts();
      } else {
        toast.error('Erro ao deletar produto');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao deletar produto');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetImportState();
              setImportOpen(true);
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Importar (.xls / .pdf)
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Destaque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum produto encontrado. Clique em "Adicionar Produto" para começar.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="relative h-12 w-12 flex-shrink-0 mr-3 rounded overflow-hidden bg-gray-100">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              Sem img
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {product.description.substring(0, 50)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      R$ {product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          product.stock > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.featured ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Sim
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                          Não
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product.id, product.name)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) resetImportState();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar catálogo (Excel ou PDF)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              <strong>Excel (.xls / .xlsx):</strong> relatório tipo <em>Relação de estoque</em>{' '}
              (código, nome, grupo, marca, estoque, valores).
            </p>
            <p>
              <strong>PDF:</strong> o export LW <em>Relatório de Produtos / Código de barras</em>{' '}
              (ficheiro típico: <code className="text-[10px]">Relatorio de Produtos Codigo de Barras LW.pdf</code>
              ) com <strong>texto selecionável</strong> — PDF só de imagem (scan) não funciona. Colunas:
              Código, Produto, Unid., Cod.Barra, Peso, Custo, Venda Vista, Venda Prazo, Estoque, Status.
              Preço no site: <strong>Venda Vista</strong> (se zero, usa Venda Prazo). Categoria:{' '}
              <strong>Importado PDF</strong>. Use <strong>Prévia</strong> ou <strong>Importar</strong> aqui; o
              servidor dedicado (Render) só aceita Excel.
            </p>
            <p className="text-xs text-gray-500">
              Tamanho máximo do ficheiro: {MAX_IMPORT_FILE_DESC} (em Vercel Hobby o limite da plataforma
              pode ser menor).
            </p>
            {importRemoteAvailable ? (
              <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
                <strong>Servidor dedicado (Render):</strong> disponível. Aceita o mesmo Excel que o fluxo
                local; o pedido é reencaminhado pelo Macofel com token seguro (útil para ficheiros
                grandes ou timeouts longos). PDF continua só na importação normal.
              </p>
            ) : importRemoteAvailable === false ? (
              <p className="text-xs text-gray-400">
                Servidor dedicado: não configurado (<code className="text-[10px]">RENDER_CATALOG_IMPORT_URL</code>{' '}
                + <code className="text-[10px]">RENDER_CATALOG_IMPORT_SECRET</code> no .env).
              </p>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Ficheiro</label>
              <Input
                type="file"
                accept=".xls,.xlsx,.pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && importFileTooLarge(f)) {
                    toast.error(`Ficheiro demasiado grande (máx. ${MAX_IMPORT_FILE_DESC})`);
                    e.target.value = '';
                    setImportFile(null);
                    setImportPreview(null);
                    setImportResult(null);
                    return;
                  }
                  setImportFile(f ?? null);
                  setImportPreview(null);
                  setImportResult(null);
                }}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={importUpsert}
                onChange={(e) => setImportUpsert(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span>
                Atualizar produtos já existentes (mesmo código + nome → mesmo identificador interno)
              </span>
            </label>
            {importRemoteAvailable ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importRemoteEnrichAi}
                  onChange={(e) => setImportRemoteEnrichAi(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span>
                  Enriquecer com IA (Google Gemini) no servidor dedicado — nomes e descrições em
                  pt-PT; requer <code className="text-[10px]">GEMINI_API_KEY</code> na Render; pode
                  demorar em catálogos grandes.
                </span>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!importFile || importPreviewLoading}
                onClick={() => void handleImportPreview()}
              >
                {importPreviewLoading ? 'A gerar prévia…' : 'Prévia'}
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                disabled={!importFile || importRunLoading}
                onClick={() => void handleImportRun()}
              >
                {importRunLoading ? 'A importar…' : 'Importar'}
              </Button>
              {importRemoteAvailable ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    !importFile || importRemoteLoading || importRunLoading || importPreviewLoading
                  }
                  onClick={() => void handleImportRemoteRun()}
                >
                  {importRemoteLoading ? 'Servidor dedicado…' : 'Importar (servidor dedicado)'}
                </Button>
              ) : null}
            </div>
            {importPreview && (
              <div className="space-y-2">
                <p className="font-medium text-gray-900">
                  Prévia: {importPreview.totalRows} produto(s) — primeiras {importPreview.sample.length}{' '}
                  linhas
                </p>
                {importPreview.warnings.length > 0 && (
                  <ul className="list-disc pl-5 text-amber-800 text-xs">
                    {importPreview.warnings.slice(0, 8).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
                <div className="border rounded-md overflow-x-auto max-h-56 overflow-y-auto text-xs">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">Cód.</th>
                        <th className="px-2 py-1 text-left">Nome</th>
                        {importPreview.source === 'pdf' ? (
                          <>
                            <th className="px-2 py-1 text-left">EAN</th>
                            <th className="px-2 py-1 text-left">St.</th>
                            <th className="px-2 py-1 text-left">Qtd</th>
                            <th className="px-2 py-1 text-left">Vista</th>
                          </>
                        ) : (
                          <>
                            <th className="px-2 py-1 text-left">Grupo</th>
                            <th className="px-2 py-1 text-left">Qtd</th>
                            <th className="px-2 py-1 text-left">Preço</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importPreview.sample.map((r, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 whitespace-nowrap">{r.code}</td>
                          <td className="px-2 py-1 max-w-[200px] truncate" title={r.name}>
                            {r.name}
                          </td>
                          {importPreview.source === 'pdf' ? (
                            <>
                              <td className="px-2 py-1 whitespace-nowrap text-[10px]">
                                {r.barcode || '—'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap">{r.status}</td>
                              <td className="px-2 py-1">{r.stock}</td>
                              <td className="px-2 py-1">R$ {r.price.toFixed(2)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-1 whitespace-nowrap">{r.grupo}</td>
                              <td className="px-2 py-1">{r.stock}</td>
                              <td className="px-2 py-1">R$ {r.price.toFixed(2)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {importResult && (
              <div
                id="importacao-resultado"
                className="rounded-md border border-green-200 bg-green-50/80 p-3 text-sm space-y-1 scroll-mt-4"
              >
                <p>
                  <strong>Criados:</strong> {importResult.created} · <strong>Atualizados:</strong>{' '}
                  {importResult.updated} · <strong>Ignorados:</strong> {importResult.skipped}
                </p>
                {importResult.errors.length > 0 && (
                  <div className="text-red-700 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                    <p className="font-medium">Erros por linha ({importResult.errors.length}):</p>
                    <ul className="list-disc pl-4">
                      {importResult.errors.slice(0, 12).map((e, i) => (
                        <li key={i}>
                          <span className="font-medium">{e.name}</span>: {e.message}
                        </li>
                      ))}
                    </ul>
                    {importResult.errors.length > 12 && (
                      <p className="text-gray-600">… e mais {importResult.errors.length - 12}</p>
                    )}
                  </div>
                )}
                {importResult.warnings.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-amber-900">
                    {importResult.warnings.slice(0, 6).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nome do Produto <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Cimento CP II 50kg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Descrição <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o produto..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Preço (R$) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estoque</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estoque mínimo</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Peso (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Categoria <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Imagem do Produto</label>
              
              {/* Preview da imagem */}
              {imagePreview && (
                <div className="mb-3 relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Upload de arquivo */}
              <div className="mb-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-2"></div>
                        <p className="text-sm text-gray-500">Enviando...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP (máx. 5MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </div>

              {/* Ou URL alternativa */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">ou</span>
                </div>
              </div>

              <Input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setImagePreview(e.target.value || null);
                }}
                placeholder="https://exemplo.com/imagem.jpg"
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cole uma URL de imagem ou faça upload de um arquivo acima
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="featured" className="text-sm font-medium">
                Produto em destaque
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                <Save className="h-4 w-4 mr-2" />
                {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
