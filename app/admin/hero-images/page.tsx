'use client';

import React, { useEffect, useState, ErrorInfo } from 'react';
import { Download, Edit, Image as ImageIcon, Link2, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface HeroSlide {
  id: string;
  imageUrl: string;
  subtitle?: string | null;
  title?: string | null;
  text?: string | null;
  href?: string | null;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-red-600 text-xl font-semibold">Erro ao carregar página</div>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Recarregar Página
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AdminHeroImagesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importingCurrentHero, setImportingCurrentHero] = useState(false);
  const [formData, setFormData] = useState({
    imageUrl: '',
    subtitle: '',
    title: '',
    text: '',
    href: '',
    order: 0,
    active: true,
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit') ?? null;

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/hero-slides');

      if (res.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        const qs = searchParams?.toString();
        const back = qs ? `${pathname}?${qs}` : pathname || '/';
        window.location.href = `/login?callbackUrl=${encodeURIComponent(back)}`;
        return;
      }

      if (res.status === 403) {
        toast.error('Acesso negado. Você precisa ser administrador.');
        return;
      }

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro ao carregar slides');
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const normalized: HeroSlide[] = list
        .filter((s: any) => s && s.id)
        .map((s: any) => ({
          id: String(s.id),
          imageUrl: String(s.imageUrl || ''),
          subtitle: s.subtitle ?? null,
          title: s.title ?? null,
          text: s.text ?? null,
          href: s.href ?? null,
          order: typeof s.order === 'number' ? s.order : 0,
          active: typeof s.active === 'boolean' ? s.active : true,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));

      setSlides(normalized);
    } catch (error) {
      console.error('Erro ao buscar slides:', error);
      toast.error('Erro ao carregar slides');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    try {
      setUploadingImage(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/admin/hero-images/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, imageUrl: String(data.imageUrl || '') }));
        toast.success('Imagem enviada com sucesso!');
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro ao fazer upload');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      imageUrl: '',
      subtitle: '',
      title: '',
      text: '',
      href: '',
      order: 0,
      active: true,
    });
    setEditingSlide(null);
  };

  const handleOpenDialog = (slide?: HeroSlide) => {
    if (slide) {
      setEditingSlide(slide);
      setFormData({
        imageUrl: slide.imageUrl,
        subtitle: slide.subtitle ?? '',
        title: slide.title ?? '',
        text: slide.text ?? '',
        href: slide.href ?? '',
        order: slide.order ?? 0,
        active: slide.active ?? true,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  /** Fecha o modal e remove `?edit=` da URL (senão o useEffect reabre o diálogo). */
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
    const sp = searchParams;
    if (sp?.get('edit')) {
      const params = new URLSearchParams(sp.toString());
      params.delete('edit');
      const qs = params.toString();
      const basePath = pathname ?? '/';
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    }
  };

  // Se vier `?edit=<id>`, abre o editor do slide correspondente.
  useEffect(() => {
    if (loading) return;
    if (!editId) return;
    if (isDialogOpen) return;

    const slide = slides.find((s) => s.id === editId);
    if (slide) handleOpenDialog(slide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, editId, slides, isDialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.imageUrl.trim()) {
      toast.error('URL da imagem é obrigatória');
      return;
    }

    try {
      const method = editingSlide ? 'PUT' : 'POST';
      const payload = {
        ...(editingSlide ? { id: editingSlide.id } : {}),
        imageUrl: formData.imageUrl.trim(),
        subtitle: formData.subtitle.trim() || null,
        title: formData.title.trim() || null,
        text: formData.text.trim() || null,
        href: formData.href.trim() || null,
        order: Number.isFinite(formData.order) ? formData.order : 0,
        active: !!formData.active,
      };

      const res = await fetch('/api/admin/hero-slides', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingSlide ? 'Slide atualizado!' : 'Slide adicionado!');
        handleCloseDialog();
        fetchSlides();
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro ao salvar slide');
      }
    } catch (error) {
      console.error('Erro ao salvar slide:', error);
      toast.error('Erro ao salvar slide');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este slide?')) return;

    try {
      const res = await fetch(`/api/admin/hero-slides?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Slide deletado!');
        fetchSlides();
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro ao deletar slide');
      }
    } catch (error) {
      console.error('Erro ao deletar slide:', error);
      toast.error('Erro ao deletar slide');
    }
  };

  const handleImportCurrentHero = async () => {
    try {
      setImportingCurrentHero(true);

      const res = await fetch('/api/admin/hero-slides/import-current', {
        method: 'POST',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Erro ao importar hero atual');
        return;
      }

      if (data.skipped) {
        toast.info(data.message || 'Importação ignorada: já existem slides cadastrados.');
      } else {
        toast.success(`Slides importados com sucesso (${String(data.imported ?? 0)}).`);
      }

      await fetchSlides();
    } catch (error) {
      console.error('Erro ao importar hero atual:', error);
      toast.error('Erro ao importar hero atual');
    } finally {
      setImportingCurrentHero(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  const safeSlides = Array.isArray(slides)
    ? slides.filter((s) => s && s.id && typeof s.id === 'string')
    : [];

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Slides do Hero</h1>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleImportCurrentHero}
              disabled={importingCurrentHero}
            >
              <Download className="h-4 w-4 mr-2" />
              {importingCurrentHero ? 'Importando...' : 'Importar hero atual'}
            </Button>
            <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Slide
            </Button>
          </div>
        </div>

        {safeSlides.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum slide cadastrado</h3>
            <p className="text-gray-600 mb-6">Adicione slides para o carousel do hero da página inicial</p>
            <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Slide
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeSlides
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((slide) => (
                <div key={slide.id} className="bg-white rounded-lg shadow p-6">
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4 border border-gray-200">
                    {slide.imageUrl?.trim() ? (
                      <Image
                        src={slide.imageUrl}
                        alt={slide.title || slide.subtitle || 'Slide do Hero'}
                        fill
                        className="object-cover object-center"
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-12 w-12 text-gray-300" />
                      </div>
                    )}

                    <div className="absolute top-2 right-2 flex gap-2">
                      {slide.active ? (
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-medium">Ativo</span>
                      ) : (
                        <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded font-medium">Inativo</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {slide.title || slide.subtitle || 'Slide'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Ordem:</span>
                          <span>{slide.order ?? 0}</span>
                        </span>
                      </div>
                    </div>

                    {slide.href ? (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          Link
                        </p>
                        <p className="text-xs text-gray-600 truncate">{String(slide.href)}</p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <p className="text-xs text-yellow-700">Sem link configurado</p>
                      </div>
                    )}

                    {(slide.subtitle || slide.text) && (
                      <div className="space-y-1">
                        {slide.subtitle && (
                          <p className="text-xs text-gray-600 truncate">
                            <span className="font-medium">Subtitle:</span> {String(slide.subtitle)}
                          </p>
                        )}
                        {slide.text && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            <span className="font-medium">Texto:</span> {String(slide.text)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog(slide)} className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(slide.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (open) setIsDialogOpen(true);
            else handleCloseDialog();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSlide ? 'Editar Slide do Hero' : 'Adicionar Novo Slide do Hero'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.imageUrl && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Upload de Imagem</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-2" />
                        <p className="text-sm text-gray-500">Enviando...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP (máx. 10MB)</p>
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

              <div>
                <label className="block text-sm font-medium mb-1">
                  URL da Imagem <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subtitle</label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Ex.: Promoção da Semana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex.: Tudo para sua obra"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Texto</label>
                <Textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Ex.: Materiais de qualidade com os melhores preços"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Link (href)</label>
                  <Input
                    value={formData.href}
                    onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                    placeholder="Ex.: /catalogo?category=ferramentas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ordem</label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium">Slide Ativo</span>
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">
                  <Save className="h-4 w-4 mr-2" />
                  {editingSlide ? 'Salvar Alterações' : 'Adicionar Slide'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}
