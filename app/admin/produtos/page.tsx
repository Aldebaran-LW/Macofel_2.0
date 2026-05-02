'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  FileText,
  Filter,
  ArrowUpDown,
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
import {
  importFileTooLarge,
  IS_VERCEL_STYLE_DEPLOY,
  MAX_IMPORT_FILE_DESC,
  readJsonOrBodyLimitError,
} from '@/lib/import-upload-limits';
import { isMasterAdminRole } from '@/lib/permissions';
import { normalizeValidGtin } from '@/lib/gtin-validate';

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
  imageUrls?: string[] | null;
  categoryId: string;
  featured: boolean;
  /** false = não listar na página inicial (catálogo normal continua). */
  showOnHome?: boolean;
  codigo?: string | null;
  cost?: number | null;
  pricePrazo?: number | null;
  unidade?: string | null;
  codBarra?: string | null;
  marca?: string | null;
  /** false = inativo no catálogo público */
  status?: boolean;
  category: { name: string; id: string };
}

interface Category {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  isRoot?: boolean;
}

/** Pré-visualização de importação de catálogo (resposta JSON da API). */
interface CatalogImportPreviewSample {
  code: string;
  name: string;
  stock: number;
  price: number;
  slug: string;
  source?: 'xls' | 'pdf' | 'docx' | 'doc' | 'rtf' | 'txt';
  grupo?: string;
  marca?: string;
  barcode?: string;
  status?: string;
  vendaPrazo?: number;
  custo?: number;
  sheet?: string;
  row?: number;
  line?: number;
}

export default function AdminProdutosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const catalogAiFileRef = useRef<HTMLInputElement>(null);
  const quickBarcodeRef = useRef<HTMLInputElement>(null);
  const [importCatalogAiUploading, setImportCatalogAiUploading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickBarcode, setQuickBarcode] = useState('');
  const [quickLookupLoading, setQuickLookupLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    minStock: '',
    weight: '',
    imageUrl: '',
    imageUrls: [] as string[],
    categoryId: '',
    featured: false,
    showOnHome: true,
    codigo: '',
    cost: '',
    pricePrazo: '',
    unidade: '',
    codBarra: '',
    marca: '',
    subcategoria: '',
    statusActive: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const normalizeImageUrlInput = (raw: string) => {
    const v = raw.trim();
    if (!v) return '';
    if (v.startsWith('/')) return v;
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    // Permitir colar "api/images/..." sem barra inicial
    if (v.startsWith('api/')) return `/${v}`;
    return v;
  };

  const isValidImageUrlInput = (raw: string) => {
    const v = raw.trim();
    if (!v) return true;
    if (v.startsWith('/')) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUpsert, setImportUpsert] = useState(true);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [importRunLoading, setImportRunLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    source: 'xls' | 'pdf' | 'docx' | 'doc' | 'rtf' | 'txt';
    totalRows: number;
    sample: Array<{
      code: string;
      name: string;
      stock: number;
      price: number;
      pricePrazo?: number;
      slug: string;
      source?: 'xls' | 'pdf' | 'docx' | 'doc' | 'rtf' | 'txt';
      grupo?: string;
      marca?: string;
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
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importConfirmKind, setImportConfirmKind] = useState<'local' | 'remote' | null>(null);
  /** Manter estoque da base na importação de catálogo (upsert). Somar estoque: Estoque → Importação. */
  const [importPreserveStockDb, setImportPreserveStockDb] = useState(false);

  const [filterSearch, setFilterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterCatalog, setFilterCatalog] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterStock, setFilterStock] = useState<'all' | 'in_stock' | 'out'>('all');
  const [filterFeatured, setFilterFeatured] = useState<'all' | 'yes' | 'no'>('all');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterSubcategoria, setFilterSubcategoria] = useState('');
  const [filterOptionsAdmin, setFilterOptionsAdmin] = useState<{
    marcas: string[];
    subcategorias: string[];
  }>({ marcas: [], subcategorias: [] });
  const [filterOptionsAdminLoading, setFilterOptionsAdminLoading] = useState(false);
  const filterOptionsReqSeq = useRef(0);

  const [listPage, setListPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortKey, setSortKey] = useState<
    'updatedAt' | 'name' | 'codigo' | 'marca' | 'category' | 'price' | 'stock'
  >('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  /** Força novo GET quando importámos/alterámos sem mudar página (ex.: já na página 1). */
  const [listNonce, setListNonce] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filterSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [filterSearch]);

  useEffect(() => {
    let cancelled = false;
    const seq = ++filterOptionsReqSeq.current;
    (async () => {
      setFilterOptionsAdminLoading(true);
      try {
        const p = new URLSearchParams();
        if (debouncedSearch) p.set('q', debouncedSearch);
        if (filterCategoryId !== 'all') p.set('categoryId', filterCategoryId);
        if (filterCatalog !== 'all') p.set('catalog', filterCatalog);
        if (filterStock !== 'all') p.set('stock', filterStock);
        if (filterFeatured !== 'all') p.set('featured', filterFeatured);
        const res = await fetch(`/api/admin/products/filters?${p.toString()}`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (seq !== filterOptionsReqSeq.current) return;
        setFilterOptionsAdmin({
          marcas: Array.isArray(data?.marcas) ? data.marcas : [],
          subcategorias: Array.isArray(data?.subcategorias) ? data.subcategorias : [],
        });
      } catch {
        // ignore
      } finally {
        if (cancelled) return;
        if (seq !== filterOptionsReqSeq.current) return;
        setFilterOptionsAdminLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filterCategoryId, filterCatalog, filterStock, filterFeatured]);

  useEffect(() => {
    setListPage(1);
  }, [
    debouncedSearch,
    filterCategoryId,
    filterCatalog,
    filterStock,
    filterFeatured,
    filterMarca,
    filterSubcategoria,
    pageSize,
    sortKey,
    sortDir,
  ]);

  const filtersActive =
    filterSearch.trim() !== '' ||
    filterCategoryId !== 'all' ||
    filterCatalog !== 'all' ||
    filterStock !== 'all' ||
    filterFeatured !== 'all' ||
    filterMarca.trim() !== '' ||
    filterSubcategoria.trim() !== '';

  const clearFilters = () => {
    setFilterSearch('');
    setFilterCategoryId('all');
    setFilterCatalog('all');
    setFilterStock('all');
    setFilterFeatured('all');
    setFilterMarca('');
    setFilterSubcategoria('');
  };

  const listQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(listPage));
    p.set('limit', String(pageSize));
    if (debouncedSearch) p.set('q', debouncedSearch);
    if (filterCategoryId !== 'all') p.set('categoryId', filterCategoryId);
    if (filterCatalog !== 'all') p.set('catalog', filterCatalog);
    if (filterStock !== 'all') p.set('stock', filterStock);
    if (filterFeatured !== 'all') p.set('featured', filterFeatured);
    if (filterMarca.trim()) p.set('marca', filterMarca.trim());
    if (filterSubcategoria.trim()) p.set('subcategoria', filterSubcategoria.trim());
    if (sortKey) p.set('sort', sortKey);
    if (sortDir) p.set('dir', sortDir);
    return p.toString();
  }, [
    listPage,
    pageSize,
    debouncedSearch,
    filterCategoryId,
    filterCatalog,
    filterStock,
    filterFeatured,
    filterMarca,
    filterSubcategoria,
    sortKey,
    sortDir,
  ]);

  const toggleSort = (
    key: 'name' | 'codigo' | 'marca' | 'category' | 'price' | 'stock'
  ) => {
    setSortKey((prev) => {
      if (prev !== key) {
        setSortDir('asc');
        return key;
      }
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return prev;
    });
  };

  const SortHeader = ({
    label,
    k,
  }: {
    label: string;
    k: 'name' | 'codigo' | 'marca' | 'category' | 'price' | 'stock';
  }) => {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-left"
        title="Clique para ordenar"
      >
        <span>{label}</span>
        <ArrowUpDown
          className={`h-3.5 w-3.5 ${active ? 'text-gray-900' : 'text-gray-400'}`}
          aria-hidden
        />
        {active ? (
          <span className="sr-only">{sortDir === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}</span>
        ) : null}
      </button>
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/products?${listQuery}`, { credentials: 'include' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (!cancelled) {
            console.error('fetchProducts admin:', res.status, err);
            toast.error(err?.error || `Erro ${res.status} ao carregar produtos`);
            setProducts([]);
            setTotalCount(0);
            setTotalPages(1);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const pag = data?.pagination;
        const rows = data?.products ?? [];
        if (
          rows.length === 0 &&
          (pag?.total ?? 0) > 0 &&
          listPage > 1
        ) {
          setListPage((lp) => Math.max(1, lp - 1));
          return;
        }
        setProducts(rows);
        setTotalCount(typeof pag?.total === 'number' ? pag.total : rows.length);
        setTotalPages(Math.max(1, typeof pag?.totalPages === 'number' ? pag.totalPages : 1));
      } catch (error) {
        if (!cancelled) {
          console.error('Erro:', error);
          toast.error('Erro ao carregar produtos');
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listQuery, listNonce]);

  useEffect(() => {
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

  const bumpProductList = () => setListNonce((n) => n + 1);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        const rows: Category[] = Array.isArray(data) ? data : [];
        // No filtro do admin, queremos apenas as 6 categorias macro (raízes).
        const roots = rows.filter((c) => c?.isRoot === true || !c?.parentId);
        // Ordenação estável por nome
        roots.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
        setCategories(roots);
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
      imageUrls: [],
      categoryId: '',
      featured: false,
      showOnHome: true,
      codigo: '',
      cost: '',
      pricePrazo: '',
      unidade: '',
      codBarra: '',
      marca: '',
      subcategoria: '',
      statusActive: true,
    });
    setEditingProduct(null);
    setImagePreview(null);
  };

  const removeImageFromGallery = (url: string) => {
    setFormData((prev) => {
      const nextUrls = prev.imageUrls.filter((u) => u !== url);
      const nextPrimary = prev.imageUrl === url ? (nextUrls[0] ?? '') : prev.imageUrl;
      return { ...prev, imageUrls: nextUrls, imageUrl: nextPrimary };
    });
    setImagePreview((prev) => {
      if (!prev) return prev;
      if (prev !== url) return prev;
      const next = formData.imageUrls.filter((u) => u !== url)[0] ?? null;
      return next;
    });
  };

  const setPrimaryImage = (url: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
    setImagePreview(url);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploadingImage(true);

    try {
      let okCount = 0;
      for (const file of files) {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
          toast.error(`Arquivo inválido (${file.name}). Selecione uma imagem.`);
          continue;
        }
        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Arquivo muito grande (${file.name}). Máx: 5MB`);
          continue;
        }

        const fd = new FormData();
        fd.append('file', file);

        const res = await fetch('/api/admin/products/upload-image', {
          method: 'POST',
          body: fd,
        });

        if (res.ok) {
          const data = await res.json();
          const url = normalizeImageUrlInput(String(data.imageUrl ?? ''));
          if (!url) continue;
          okCount += 1;
          setFormData((prev) => {
            const nextUrls = Array.from(new Set([...(prev.imageUrls ?? []), url]));
            return {
              ...prev,
              imageUrls: nextUrls,
              imageUrl: prev.imageUrl?.trim() ? prev.imageUrl : url,
            };
          });
          setImagePreview((prev) => prev ?? url);
        } else {
          const error = await res.json().catch(() => ({}));
          toast.error(error?.error || `Erro ao fazer upload (${file.name})`);
        }
      }
      if (okCount > 0) toast.success(`${okCount} imagem(ns) enviada(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
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
        imageUrls: Array.isArray(product.imageUrls)
          ? product.imageUrls.filter((u) => typeof u === 'string' && u.trim())
          : product.imageUrl
            ? [product.imageUrl]
            : [],
        categoryId: product.categoryId,
        featured: product.featured,
        showOnHome: product.showOnHome !== false,
        codigo: product.codigo ?? '',
        cost: product.cost != null ? String(product.cost) : '',
        pricePrazo: product.pricePrazo != null ? String(product.pricePrazo) : '',
        unidade: product.unidade ?? '',
        codBarra: product.codBarra ?? '',
        marca: product.marca ?? '',
        subcategoria: (product as any).subcategoria ?? '',
        statusActive: product.status !== false,
      });
      setImagePreview(product.imageUrl || null);
    } else {
      resetForm();
      setImagePreview(null);
    }
    setQuickBarcode('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
    setQuickBarcode('');
  };

  const handleSubmit = async (
    e: React.FormEvent,
    opts?: { keepOpen?: boolean; resetAfter?: boolean }
  ) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (!isValidImageUrlInput(formData.imageUrl)) {
      toast.error('URL da imagem inválida (use http(s):// ou um caminho /api/...)');
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
          imageUrl: normalizeImageUrlInput(formData.imageUrl) || null,
          imageUrls: Array.isArray(formData.imageUrls)
            ? formData.imageUrls.map((u) => normalizeImageUrlInput(u)).filter(Boolean)
            : [],
          categoryId: formData.categoryId,
          featured: formData.featured,
          showOnHome: formData.showOnHome,
          codigo: formData.codigo.trim() || null,
          cost: formData.cost.trim() || null,
          pricePrazo: formData.pricePrazo.trim() || null,
          unidade: formData.unidade.trim() || null,
          codBarra: formData.codBarra.trim() || null,
          marca: formData.marca.trim() || null,
          subcategoria: formData.subcategoria.trim() || null,
          status: formData.statusActive,
        }),
      });

      if (res.ok) {
        toast.success(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
        if (opts?.keepOpen) {
          bumpProductList();
          if (opts?.resetAfter) {
            resetForm();
            setQuickBarcode('');
            requestAnimationFrame(() => quickBarcodeRef.current?.focus());
          }
        } else {
          handleCloseDialog();
          bumpProductList();
        }
      } else {
        const error = await res.json().catch(() => ({}));
        const msg = String(error?.error || 'Erro ao salvar produto');
        const details = error?.details ? ` — ${String(error.details)}` : '';
        toast.error(`${msg}${details}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar produto');
    }
  };

  const lookupExistingProductByBarcode = async (eanDigits: string) => {
    const p = new URLSearchParams();
    p.set('q', eanDigits);
    p.set('limit', '20');
    p.set('page', '1');
    const res = await fetch(`/api/admin/products?${p.toString()}`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const rows: Product[] = Array.isArray(data?.products) ? data.products : [];
    const exact = rows.find((r) => String(r?.codBarra ?? '').replace(/\D/g, '') === eanDigits);
    return exact ?? null;
  };

  const applyEnrichmentFromBuscarProduto = (enriched: any, eanDigits: string) => {
    const title = typeof enriched?.title === 'string' ? enriched.title.trim() : '';
    const photos: string[] = Array.isArray(enriched?.photos)
      ? enriched.photos.filter((u: unknown) => typeof u === 'string')
      : [];
    const weightGrams =
      typeof enriched?.weight_grams === 'number' && Number.isFinite(enriched.weight_grams)
        ? enriched.weight_grams
        : null;

    setFormData((prev) => ({
      ...prev,
      codBarra: eanDigits,
      name: prev.name.trim() ? prev.name : title || prev.name,
      description: prev.description.trim()
        ? prev.description
        : title
          ? title
          : prev.description,
      weight:
        prev.weight.trim() !== '' || weightGrams == null
          ? prev.weight
          : String(Number((weightGrams / 1000).toFixed(3))),
      imageUrl: prev.imageUrl.trim() ? prev.imageUrl : photos[0] || prev.imageUrl,
    }));
    if (photos[0]) setImagePreview(photos[0]);
  };

  const handleQuickBarcodeCommit = async () => {
    if (quickLookupLoading) return;
    const normalized = normalizeValidGtin(quickBarcode);
    if (!normalized) {
      toast.error('EAN/GTIN inválido. Confira os dígitos (inclui dígito verificador).');
      return;
    }

    setQuickLookupLoading(true);
    try {
      const existing = await lookupExistingProductByBarcode(normalized);
      if (existing) {
        toast.message('Produto já existe — abrindo para editar.');
        handleOpenDialog(existing);
        requestAnimationFrame(() => quickBarcodeRef.current?.focus());
        return;
      }

      setFormData((prev) => ({ ...prev, codBarra: normalized }));
      const p = new URLSearchParams();
      p.set('ean', normalized);
      if (formData.name.trim()) p.set('nameHint', formData.name.trim());
      const res = await fetch(`/api/buscar-produto?${p.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const enriched = await res.json().catch(() => null);
        if (enriched) {
          applyEnrichmentFromBuscarProduto(enriched, normalized);
          toast.success('EAN lido — campos preenchidos automaticamente (quando disponíveis).');
        } else {
          toast.message('EAN lido — sem dados de enriquecimento.');
        }
      } else {
        toast.message('EAN lido — sem enriquecimento disponível (cadastre manualmente).');
      }
    } catch (e) {
      console.error(e);
      toast.error('Falha ao processar o código de barras');
    } finally {
      setQuickLookupLoading(false);
    }
  };

  const resetImportState = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportUpsert(true);
    setImportRemoteEnrichAi(false);
    setImportCatalogAiUploading(false);
    if (catalogAiFileRef.current) catalogAiFileRef.current.value = '';
  };

  const handleCatalogImportWithAi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importFileTooLarge(file)) {
      toast.error(`Ficheiro demasiado grande (máx. ${MAX_IMPORT_FILE_DESC})`);
      e.target.value = '';
      return;
    }
    setImportCatalogAiUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/catalog/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === 'string'
            ? data.error
            : `Erro ${res.status} ao enviar para o agente`
        );
        return;
      }
      toast.success(
        typeof data.message === 'string' ? data.message : 'Ficheiro enviado ao pipeline de catálogo.'
      );
      if (isMasterAdminRole((session?.user as { role?: string })?.role)) {
        setTimeout(() => router.push('/admin/estoque/produtos-pendentes'), 1200);
      } else {
        toast.info(
          'Rascunhos ficam em revisão: um utilizador Master pode aprovar em Master → Produtos pendentes.'
        );
      }
    } catch {
      toast.error('Erro de rede ao enviar ficheiro');
    } finally {
      setImportCatalogAiUploading(false);
      e.target.value = '';
    }
  };

  const handleImportPreview = async () => {
    if (!importFile) {
      toast.error('Selecione um ficheiro .xls, .xlsx, .pdf, .docx, .doc, .rtf ou .txt');
      return;
    }
    setImportPreviewLoading(true);
    setImportResult(null);
    const loadingToast = toast.loading('A gerar prévia do ficheiro…', { duration: Infinity });
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch('/api/admin/products/import/preview', {
        method: 'POST',
        body: fd,
      });
      const parsed = await readJsonOrBodyLimitError(res);
      if (!parsed.ok) {
        toast.error(parsed.message);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        toast.error(String(data.error || 'Erro na prévia'));
        return;
      }
      const src = data.source as string;
      const previewSource: 'xls' | 'pdf' | 'docx' | 'doc' | 'rtf' | 'txt' =
        src === 'pdf' || src === 'docx' || src === 'doc' || src === 'rtf' || src === 'txt' ? src : 'xls';
      const previewRows = Number(data.totalRows);
      setImportPreview({
        source: previewSource,
        totalRows: Number.isFinite(previewRows) ? previewRows : 0,
        sample: Array.isArray(data.sample) ? (data.sample as CatalogImportPreviewSample[]) : [],
        warnings: Array.isArray(data.warnings) ? data.warnings.map(String) : [],
      });
      toast.success(`Prévia: ${Number.isFinite(previewRows) ? previewRows : 0} linha(s) reconhecida(s).`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar prévia');
    } finally {
      toast.dismiss(loadingToast);
      setImportPreviewLoading(false);
    }
  };

  const openImportConfirm = (kind: 'local' | 'remote') => {
    if (!importFile) {
      toast.error(
        kind === 'remote'
          ? 'Selecione um ficheiro .xls ou .xlsx'
          : 'Selecione um ficheiro .xls, .xlsx, .pdf, .docx, .doc, .rtf ou .txt'
      );
      return;
    }
    if (kind === 'remote') {
      const n = importFile.name.toLowerCase();
      if (n.endsWith('.pdf')) {
        toast.error('O servidor dedicado só aceita Excel. Para PDF use a importação normal.');
        return;
      }
      if (n.endsWith('.docx') || n.endsWith('.doc') || n.endsWith('.rtf') || n.endsWith('.txt')) {
        toast.error(
          'O servidor dedicado só aceita Excel. Para Word/RTF/TXT use a importação normal (nesta janela).'
        );
        return;
      }
      if (!n.endsWith('.xls') && !n.endsWith('.xlsx')) {
        toast.error('Use .xls ou .xlsx para o servidor dedicado.');
        return;
      }
    }
    setImportPreserveStockDb(false);
    setImportConfirmKind(kind);
    setImportConfirmOpen(true);
  };

  const runCatalogImportLocal = async (preserveStockDb: boolean) => {
    if (!importFile) return;
    setImportRunLoading(true);
    setImportResult(null);
    const loadingToast = toast.loading('A importar o catálogo (servidor local)…', { duration: Infinity });
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('upsert', importUpsert ? 'true' : 'false');
      fd.append('preserve_stock_db', preserveStockDb ? 'true' : 'false');
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        body: fd,
      });
      const parsed = await readJsonOrBodyLimitError(res);
      if (!parsed.ok) {
        toast.error(parsed.message);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        toast.error(
          [data.error, data.details].filter(Boolean).join(' — ') || 'Erro na importação'
        );
        return;
      }
      setImportResult({
        created: data.created as number,
        updated: data.updated as number,
        skipped: data.skipped as number,
        errors: (data.errors as Array<{ name: string; message: string }>) ?? [],
        warnings: (data.warnings as string[]) ?? [],
      });
      const c = (data.created as number) ?? 0;
      const u = (data.updated as number) ?? 0;
      const s = (data.skipped as number) ?? 0;
      if (c + u === 0) {
        toast.warning(
          s > 0
            ? `Nenhum produto novo ou atualizado (${s} ignorados). Ative «Atualizar produtos já existentes» ou use Prévia.`
            : 'Importação terminou sem alterações (0 criados, 0 atualizados). Veja avisos abaixo no modal.'
        );
      } else {
        toast.success(`Importação: ${c} novos, ${u} atualizados, ${s} ignorados.`);
      }
      setListPage(1);
      bumpProductList();
      setTimeout(() => {
        document.getElementById('importacao-resultado')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (e) {
      console.error(e);
      toast.error('Erro na importação');
    } finally {
      toast.dismiss(loadingToast);
      setImportRunLoading(false);
    }
  };

  const runCatalogImportRemote = async (preserveStockDb: boolean) => {
    if (!importFile) return;
    setImportRemoteLoading(true);
    setImportResult(null);
    const loadingToast = toast.loading('A importar no servidor dedicado (pode demorar)…', {
      duration: Infinity,
    });
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('upsert', importUpsert ? 'true' : 'false');
      fd.append('enrich_ai', importRemoteEnrichAi ? 'true' : 'false');
      fd.append('preserve_stock_db', preserveStockDb ? 'true' : 'false');
      const res = await fetch('/api/admin/products/import/remote', {
        method: 'POST',
        body: fd,
      });
      const parsed = await readJsonOrBodyLimitError(res);
      if (!parsed.ok) {
        toast.error(parsed.message);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        const detail = data.detail;
        const detailStr =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((x: { msg?: string }) => x?.msg).filter(Boolean).join('; ')
              : '';
        toast.error(String(data.error || detailStr || 'Erro na importação remota'));
        return;
      }
      const rawErrs = Array.isArray(data.errors) ? data.errors : [];
      const normErrors = rawErrs.map((e: { name?: string; message?: string; msg?: string }) => ({
        name: String(e?.name ?? '—'),
        message: String(e?.message ?? e?.msg ?? ''),
      }));
      const cr = Number(data.created);
      const ur = Number(data.updated);
      const sr = Number(data.skipped);
      setImportResult({
        created: Number.isFinite(cr) ? cr : 0,
        updated: Number.isFinite(ur) ? ur : 0,
        skipped: Number.isFinite(sr) ? sr : 0,
        errors: normErrors,
        warnings: Array.isArray(data.warnings) ? data.warnings.map(String) : [],
      });
      toast.success(
        `Importação (servidor dedicado): ${Number.isFinite(cr) ? cr : 0} novos, ${Number.isFinite(ur) ? ur : 0} atualizados, ${Number.isFinite(sr) ? sr : 0} ignorados.`
      );
      setListPage(1);
      bumpProductList();
    } catch (e) {
      console.error(e);
      toast.error('Erro na importação remota');
    } finally {
      toast.dismiss(loadingToast);
      setImportRemoteLoading(false);
    }
  };

  const executeImportConfirm = async () => {
    if (!importConfirmKind) return;
    const kind = importConfirmKind;
    const preserve = importPreserveStockDb && importUpsert;
    setImportConfirmOpen(false);
    setImportConfirmKind(null);
    if (kind === 'local') await runCatalogImportLocal(preserve);
    else await runCatalogImportRemote(preserve);
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
        bumpProductList();
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
            Importar (Excel / PDF / Word)
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500 shrink-0" aria-hidden />
          <span className="text-sm font-medium text-gray-900">Filtros</span>
          <span className="text-xs text-gray-500">
            (Página {listPage} de {totalPages} · {totalCount}{' '}
            produto{totalCount !== 1 ? 's' : ''}
            {filtersActive ? ' com estes filtros' : ''})
          </span>
          {filtersActive ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              Limpar
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="sm:col-span-2 xl:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Pesquisar</label>
            <Input
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Nome, código, EAN, slug, categoria…"
              className="h-9"
              aria-label="Pesquisar produtos"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Categoria</label>
            <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Subcategoria</label>
            <Select
              value={filterSubcategoria.trim() ? filterSubcategoria : '__all__'}
              onValueChange={(v) => setFilterSubcategoria(v === '__all__' ? '' : v)}
              disabled={filterOptionsAdminLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {filterOptionsAdmin.subcategorias.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Marca</label>
            <Select
              value={filterMarca.trim() ? filterMarca : '__all__'}
              onValueChange={(v) => setFilterMarca(v === '__all__' ? '' : v)}
              disabled={filterOptionsAdminLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {filterOptionsAdmin.marcas.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Catálogo</label>
            <Select
              value={filterCatalog}
              onValueChange={(v) => setFilterCatalog(v as 'all' | 'active' | 'inactive')}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ativos e inativos</SelectItem>
                <SelectItem value="active">Só ativos</SelectItem>
                <SelectItem value="inactive">Só inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Estoque</label>
            <Select
              value={filterStock}
              onValueChange={(v) => setFilterStock(v as 'all' | 'in_stock' | 'out')}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                <SelectItem value="in_stock">Com estoque (&gt; 0)</SelectItem>
                <SelectItem value="out">Sem estoque (0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Destaque</label>
            <Select
              value={filterFeatured}
              onValueChange={(v) => setFilterFeatured(v as 'all' | 'yes' | 'no')}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Em destaque</SelectItem>
                <SelectItem value="no">Fora de destaque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filterOptionsAdminLoading ? (
          <p className="mt-2 text-[11px] text-gray-500">
            Carregando marcas e subcategorias desta categoria…
          </p>
        ) : null}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <SortHeader label="Produto" k="name" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <SortHeader label="Cód." k="codigo" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <SortHeader label="Marca" k="marca" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <SortHeader label="Categoria" k="category" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <SortHeader label="Preço" k="price" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <SortHeader label="Estoque" k="stock" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Catálogo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Destaque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Na home
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {totalCount === 0 && !filtersActive ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    Nenhum produto encontrado. Clique em "Adicionar Produto" para começar.
                  </td>
                </tr>
              ) : totalCount === 0 && filtersActive ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    Nenhum produto corresponde aos filtros.{' '}
                    <button
                      type="button"
                      className="text-red-600 underline font-medium"
                      onClick={clearFilters}
                    >
                      Limpar filtros
                    </button>
                    .
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const thumb =
                    product.imageUrl?.trim() ||
                    (Array.isArray(product.imageUrls)
                      ? product.imageUrls.map((u) => (typeof u === 'string' ? u.trim() : '')).find(Boolean)
                      : '') ||
                    '';
                  return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="relative h-12 w-12 flex-shrink-0 mr-3 rounded overflow-hidden bg-gray-100">
                          {thumb ? (
                            <Image
                              src={thumb}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {product.codigo || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={product.marca ?? ''}>
                      {product.marca || '—'}
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
                      {product.status === false ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                          Inativo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Ativo
                        </span>
                      )}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.showOnHome !== false ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span>
              {totalCount === 0
                ? '0 produtos'
                : `${(listPage - 1) * pageSize + 1}–${(listPage - 1) * pageSize + products.length} de ${totalCount}`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Por página</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className="h-8 w-[4.5rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={listPage <= 1}
              onClick={() => setListPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-500 min-w-[7rem] text-center">
              Página {listPage} de {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={listPage >= totalPages}
              onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
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
            <DialogTitle>Importar catálogo (Excel, PDF, Word/RTF ou TXT)</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 border-b border-gray-100 pb-6 mb-2">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Recomendado
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  Importar com enriquecimento (agente / pipeline)
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Envia o ficheiro para o Vercel Blob e notifica o{' '}
                <strong>agente no Render</strong> (se <code className="text-xs bg-white/80 px-1 rounded">RENDER_CATALOG_AGENT_URL</code>{' '}
                estiver definido) ou o processamento em segundo plano neste servidor. Inclui extração +
                enriquecimento (Gemini) quando configurado no destino.
                <br />
                <strong>Depois verifique «Pendentes de revisão»</strong> antes de publicar no catálogo.
              </p>
              <input
                ref={catalogAiFileRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.pdf,.txt,.doc,.docx,.rtf"
                onChange={(ev) => void handleCatalogImportWithAi(ev)}
              />
              <Button
                type="button"
                className="w-full h-12 text-base mt-4"
                disabled={importCatalogAiUploading}
                onClick={() => catalogAiFileRef.current?.click()}
              >
                {importCatalogAiUploading
                  ? 'A enviar para o pipeline…'
                  : 'Importar com agente / pipeline IA'}
              </Button>
            </div>

            <div className="rounded-2xl border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-1">Importar direto (fluxo clássico)</h3>
              <p className="text-xs text-gray-500 mb-4">
                Pré-visualização e gravação imediata na base — secção abaixo (Prévia / Importar).
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  document
                    .getElementById('catalog-import-classic-anchor')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  toast.message('Selecione o ficheiro abaixo e use Prévia ou Importar.');
                }}
              >
                Ir para importação clássica
              </Button>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Excel:</strong> relatório de estoque (.xls / .xlsx) — código, nome, marca, quantidades e
              valores. Com LibreOffice no servidor (variável <code className="text-[10px]">MACOFEL_SOFFICE</code> no{' '}
              <code className="text-[10px]">.env</code>), muitos <code className="text-[10px]">.xls</code> problemáticos
              do LW são convertidos automaticamente. Ficheiros grandes:{' '}
              <code className="text-[10px] bg-gray-100 px-1 rounded">
                npx tsx scripts/split-xls-relatorio.ts &quot;ficheiro.xls&quot; 10 &quot;E:\Produtos exel&quot;
              </code>{' '}
              gera <code className="text-[10px]">_part01.xlsx</code> … com o mesmo cabeçalho.
            </p>
            <p>
              <strong>Word / RTF / TXT:</strong> idealmente o mesmo layout de colunas que o Excel (Produto, Grupo,
              Marca, Estoque, valores). Com relatório LW em texto vertical, <strong>Venda Vista</strong> e{' '}
              <strong>Venda Prazo</strong> são lidos em colunas separadas (prévia: «À vista» / «A prazo»). Os{' '}
              <code className="text-[10px]">_part*.txt</code> do <code className="text-[10px]">split-rtf-relatorio</code>{' '}
              vêm em <strong>layout vertical</strong> (código e nome em linhas separadas); o import trata isso
              automaticamente. RTF grandes:{' '}
              <code className="text-[10px] bg-gray-100 px-1 rounded">
                npx tsx scripts/split-rtf-relatorio.ts &quot;ficheiro.rtf&quot; 10 &quot;E:\&quot;
              </code>
              .
            </p>
            <p>
              <strong>PDF:</strong> exportação <em>Produtos / código de barras</em> do seu software, com{' '}
              <strong>texto que consiga copiar</strong> (PDF digitalizado não serve). Preço no site: coluna{' '}
              <strong>Venda Vista</strong>; se estiver vazio, usa <strong>Venda Prazo</strong>. A{' '}
              <strong>macro</strong> vem do mapa de grupos quando existe coluna/grupo; no PDF típico (sem grupo)
              usa-se a primeira macro da vitrine na base.
            </p>
            <p className="text-xs text-gray-500">Tamanho máximo por ficheiro neste ambiente: {MAX_IMPORT_FILE_DESC}.</p>
            {IS_VERCEL_STYLE_DEPLOY ? (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                Alojamento Vercel: o pedido HTTP fica limitado a cerca de <strong>4 MB</strong>. PDFs ou Excel
                maiores falham com erro de tamanho — use <strong>servidor dedicado</strong> (Excel), divida o
                ficheiro, ou aloje a app num VPS/Render com limite maior. Relatórios <strong>.xls</strong> do LW
                que dão erro tipo «LABELSST» / «0xfd» no painel: a conversão automática precisa de LibreOffice no
                servidor — na Vercel não existe; <strong>guarde como .xlsx</strong> e volte a importar, ou use
                importação num servidor próprio com LibreOffice (<code className="text-[10px]">MACOFEL_SOFFICE</code> /{' '}
                <code className="text-[10px]">MACOFEL_LIBREOFFICE_HOME</code> no <code className="text-[10px]">.env</code>).
              </p>
            ) : null}
            {importRemoteAvailable ? (
              <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
                <strong>Importação no servidor dedicado:</strong> só Excel (útil para ficheiros grandes). PDF /
                Word / TXT: use Prévia / Importar nesta janela; RTF enorme →{' '}
                <code className="text-[10px]">split-rtf-relatorio</code>; Excel enorme →{' '}
                <code className="text-[10px]">split-xls-relatorio</code>.
              </p>
            ) : importRemoteAvailable === false ? (
              <p className="text-xs text-gray-400">
                Servidor dedicado não configurado — importação local (Excel, PDF, Word/RTF, TXT).
              </p>
            ) : null}
            <div id="catalog-import-classic-anchor">
              <label className="block text-sm font-medium text-gray-900 mb-1">Ficheiro</label>
              <Input
                type="file"
                accept=".xls,.xlsx,.pdf,.doc,.docx,.rtf,.txt,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,text/plain"
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
            <p className="text-[11px] text-gray-500 rounded-md bg-gray-50 border border-gray-100 px-2 py-1.5">
              <strong>Macro:</strong> o <strong>Grupo</strong> do Excel/Word é mapeado automaticamente; PDF sem grupo
              usa a primeira categoria macro da vitrine na base.
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={importUpsert}
                onChange={(e) => setImportUpsert(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span>
                Atualizar produtos já existentes — o programa <strong>não duplica</strong>: reconhece pelo
                código/slug e <strong>atualiza o mesmo registo</strong>. Com esta opção desligada, linhas já
                existentes são <strong>ignoradas</strong> (só entram produtos novos).
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
                onClick={() => openImportConfirm('local')}
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
                  onClick={() => openImportConfirm('remote')}
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
                            <th className="px-2 py-1 text-left">Marca</th>
                            <th className="px-2 py-1 text-left">Qtd</th>
                            <th className="px-2 py-1 text-left">À vista</th>
                            <th className="px-2 py-1 text-left">A prazo</th>
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
                              <td className="px-2 py-1 whitespace-nowrap max-w-[100px] truncate" title={r.marca}>
                                {r.marca ?? '—'}
                              </td>
                              <td className="px-2 py-1">{r.stock}</td>
                              <td className="px-2 py-1">R$ {r.price.toFixed(2)}</td>
                              <td className="px-2 py-1">
                                {r.pricePrazo != null && r.pricePrazo > 0
                                  ? `R$ ${r.pricePrazo.toFixed(2)}`
                                  : '—'}
                              </td>
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

      <Dialog
        open={importConfirmOpen}
        onOpenChange={(open) => {
          setImportConfirmOpen(open);
          if (!open) setImportConfirmKind(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              O relatório <strong>substitui</strong> preço, nome, marca, grupo e restantes dados nos produtos
              que já existem (não é «só preencher vazios»).
            </p>
            <p className="text-xs text-gray-600">
              Para <strong>somar estoque</strong> (entradas, NF-e): <strong>Estoque → Importação</strong>.
            </p>
            <label
              className={`flex items-start gap-2 cursor-pointer ${!importUpsert ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={importPreserveStockDb}
                disabled={!importUpsert}
                onChange={(e) => setImportPreserveStockDb(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 shrink-0"
              />
              <span>
                <strong>Manter quantidades atuais</strong> nos produtos já existentes (com «Atualizar produtos…»
                ligado): atualiza preços e dados do catálogo <strong>sem</strong> trocar as quantidades na base.{' '}
                <strong>Produtos novos</strong> usam o estoque do ficheiro.
                {!importUpsert ? (
                  <span className="block text-xs text-amber-800 mt-1">
                    Ligue «Atualizar produtos já existentes» para isto fazer efeito.
                  </span>
                ) : null}
              </span>
            </label>
            <p className="text-xs text-gray-500">Continuar?</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setImportConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void executeImportConfirm()}
            >
              Sim, gravar importação
            </Button>
          </DialogFooter>
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
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-2">
              <p className="text-sm font-medium text-gray-900">Cadastro rápido (scanner)</p>
              <p className="text-xs text-gray-600">
                Leia o <strong>código de barras</strong> e pressione <strong>Enter</strong>. Se o produto já existir,
                abrimos para editar; se não existir, tentamos preencher nome/peso/imagem automaticamente.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  ref={quickBarcodeRef}
                  value={quickBarcode}
                  onChange={(e) => setQuickBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleQuickBarcodeCommit();
                    }
                  }}
                  placeholder="EAN/GTIN (8/12/13/14 dígitos) — Enter para buscar"
                  className="font-mono text-sm"
                  aria-label="Leitura rápida de código de barras"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!quickBarcode.trim() || quickLookupLoading}
                  onClick={() => void handleQuickBarcodeCommit()}
                >
                  {quickLookupLoading ? 'Processando…' : 'Aplicar'}
                </Button>
              </div>
            </div>
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
              {editingProduct ? (
                <p className="text-xs text-gray-500 mt-1">
                  Slug na loja:{' '}
                  <code className="rounded bg-gray-100 px-1 py-px text-[11px]">{editingProduct.slug}</code>{' '}
                  — ao guardar com nome novo, o slug é recalculado automaticamente.
                </p>
              ) : null}
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

            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">Dados do relatório (importação)</p>
              <p className="text-xs text-gray-600">
                Estes campos vêm do Excel/PDF. Corrija aqui produtos errados e clique em{' '}
                <strong>Salvar Alterações</strong> — isso grava na base (não precisa importar de
                novo).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Código no relatório (fornecedor)
                  </label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="ex.: 16503"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unidade</label>
                  <Input
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    placeholder="UN, KG…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cód. barras (EAN)</label>
                  <Input
                    value={formData.codBarra}
                    onChange={(e) => setFormData({ ...formData, codBarra: e.target.value })}
                    placeholder="só dígitos"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Marca</label>
                  <Input
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    placeholder="Coluna Marca do Excel / edição manual"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subcategoria</label>
                  <Input
                    value={formData.subcategoria}
                    onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                    placeholder="Coluna Grupo do Excel (filtro no catálogo)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Custo (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="opcional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Preço prazo (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricePrazo}
                    onChange={(e) => setFormData({ ...formData, pricePrazo: e.target.value })}
                    placeholder="opcional"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.statusActive}
                  onChange={(e) => setFormData({ ...formData, statusActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm">Produto ativo na loja (desmarque para esconder do catálogo público)</span>
              </label>
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

              {/* Galeria de imagens (miniaturas) */}
              {formData.imageUrls.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {formData.imageUrls.map((u) => (
                    <div
                      key={u}
                      className={`relative h-14 w-14 rounded-md overflow-hidden border ${
                        formData.imageUrl === u ? 'border-red-500' : 'border-gray-200'
                      } bg-gray-50`}
                      title={formData.imageUrl === u ? 'Imagem principal' : 'Clique para definir como principal'}
                    >
                      <button
                        type="button"
                        className="absolute inset-0"
                        onClick={() => setPrimaryImage(u)}
                        aria-label="Definir como imagem principal"
                      />
                      <Image src={u} alt="Miniatura" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImageFromGallery(u)}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white border border-gray-200 text-gray-700 text-xs flex items-center justify-center shadow"
                        aria-label="Remover imagem"
                        title="Remover"
                      >
                        ×
                      </button>
                    </div>
                  ))}
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
                    multiple
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
                type="text"
                value={formData.imageUrl}
                onChange={(e) => {
                  const normalized = normalizeImageUrlInput(e.target.value);
                  setFormData((prev) => {
                    const nextUrls =
                      normalized && isValidImageUrlInput(normalized)
                        ? Array.from(new Set([...(prev.imageUrls ?? []), normalized]))
                        : prev.imageUrls;
                    return { ...prev, imageUrl: normalized, imageUrls: nextUrls };
                  });
                  setImagePreview(normalized || null);
                }}
                placeholder="https://exemplo.com/imagem.jpg ou /api/images/..."
                className="mt-2"
                inputMode="url"
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showOnHome"
                checked={formData.showOnHome}
                onChange={(e) => setFormData({ ...formData, showOnHome: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="showOnHome" className="text-sm font-medium">
                Exibir na home
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              {!editingProduct ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={quickLookupLoading}
                  onClick={(e) =>
                    void handleSubmit(e as unknown as React.FormEvent, {
                      keepOpen: true,
                      resetAfter: true,
                    })
                  }
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar e cadastrar próximo
                </Button>
              ) : null}
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
