'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Edit, Trash2, Save, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import Image from 'next/image';

interface HeroImage {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
  active: boolean;
  linkType?: 'product' | 'category' | 'url' | null;
  productId?: string | null;
  categorySlug?: string | null;
  linkUrl?: string | null;
  displayType?: 'grid' | 'large';
  animationOrder?: number;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AdminHeroImagesPage() {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<HeroImage | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    imageUrl: '',
    alt: 'Imagem do Hero',
    order: 0,
    active: true,
    linkType: null as 'product' | 'category' | 'url' | null,
    productId: null as string | null,
    categorySlug: null as string | null,
    linkUrl: null as string | null,
    displayType: 'grid' as 'grid' | 'large',
    animationOrder: 0,
  });

  useEffect(() => {
    fetchImages(true);
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setProducts(data?.products ?? []);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
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
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchImages = async (autoSeed = false) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/hero-images');
      
      if (res.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        window.location.href = '/admin/login';
        return;
      }
      
      if (res.status === 403) {
        toast.error('Acesso negado. Você precisa ser administrador.');
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        const imageList = Array.isArray(data) ? data : [];
        setImages(imageList);

        if (imageList.length === 0 && autoSeed) {
          const seedRes = await fetch('/api/admin/hero-images/seed', { method: 'POST' });
          if (seedRes.ok) {
            toast.success('Imagens padrão carregadas!');
            const refetchRes = await fetch('/api/admin/hero-images');
            if (refetchRes.ok) {
              const refetchData = await refetchRes.json();
              setImages(Array.isArray(refetchData) ? refetchData : []);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      toast.error('Erro ao carregar imagens');
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
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
        toast.success('Imagem enviada com sucesso!');
      } else {
        const error = await res.json();
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
      alt: 'Imagem do Hero',
      order: 0,
      active: true,
      linkType: null,
      productId: null,
      categorySlug: null,
      linkUrl: null,
      displayType: 'grid',
      animationOrder: 0,
    });
    setEditingImage(null);
  };

  const handleOpenDialog = (image?: HeroImage) => {
    if (image) {
      setEditingImage(image);
      setFormData({
        imageUrl: image.imageUrl,
        alt: image.alt,
        order: image.order,
        active: image.active,
        linkType: image.linkType || null,
        productId: image.productId || null,
        categorySlug: image.categorySlug || null,
        linkUrl: image.linkUrl || null,
        displayType: image.displayType || 'grid',
        animationOrder: image.animationOrder ?? 0,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.imageUrl.trim()) {
      toast.error('URL da imagem é obrigatória');
      return;
    }

    try {
      const url = '/api/admin/hero-images';
      const method = editingImage ? 'PUT' : 'POST';
      const body = editingImage 
        ? { id: editingImage.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingImage ? 'Imagem atualizada!' : 'Imagem adicionada!');
        handleCloseDialog();
        fetchImages();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao salvar imagem');
      }
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      toast.error('Erro ao salvar imagem');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta imagem?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/hero-images?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Imagem deletada!');
        fetchImages();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao deletar imagem');
      }
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      toast.error('Erro ao deletar imagem');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Imagens Hero</h1>
        <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Imagem
        </Button>
      </div>

      {images.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma imagem cadastrada</h3>
          <p className="text-gray-600 mb-6">Adicione imagens para o hero da página inicial</p>
          <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeira Imagem
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <div key={image.id} className="bg-white rounded-lg shadow p-6">
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
                {image.imageUrl ? (
                  <Image
                    src={image.imageUrl}
                    alt={image.alt}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                {image.active ? (
                  <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    Ativa
                  </div>
                ) : (
                  <div className="absolute top-2 left-2 bg-gray-600 text-white text-xs px-2 py-1 rounded">
                    Inativa
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{image.alt}</h3>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Ordem: {image.order}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    image.displayType === 'grid' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {image.displayType === 'grid' ? 'Grid' : 'Large'}
                  </span>
                </div>
                {image.linkType && (
                  <p className="text-xs text-gray-500">
                    Link: {
                      image.linkType === 'product' && image.productId
                        ? `Produto: ${products.find(p => p.id === image.productId)?.name || image.productId}`
                        : image.linkType === 'category' && image.categorySlug
                        ? `Categoria: ${categories.find(c => c.slug === image.categorySlug)?.name || image.categorySlug}`
                        : image.linkType === 'url' && image.linkUrl
                        ? image.linkUrl
                        : 'Nenhum'
                    }
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDialog(image)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(image.id)}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingImage ? 'Editar Imagem Hero' : 'Adicionar Nova Imagem Hero'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preview da imagem */}
            {formData.imageUrl && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                <Image
                  src={formData.imageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Upload de arquivo */}
            <div>
              <label className="block text-sm font-medium mb-1">Upload de Imagem</label>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="cursor-pointer"
                />
                {uploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" />
                  </div>
                )}
              </div>
            </div>

            {/* URL da imagem */}
            <div>
              <label className="block text-sm font-medium mb-1">URL da Imagem <span className="text-red-500">*</span></label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
                required
              />
            </div>

            {/* Texto alternativo */}
            <div>
              <label className="block text-sm font-medium mb-1">Texto Alternativo</label>
              <Input
                value={formData.alt}
                onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
                placeholder="Descrição da imagem"
              />
            </div>

            {/* Tipo de link */}
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Link</label>
              <Select
                value={formData.linkType || ''}
                onValueChange={(value) => {
                  const linkType = value as 'product' | 'category' | 'url' | '';
                  setFormData({
                    ...formData,
                    linkType: linkType || null,
                    productId: linkType !== 'product' ? null : formData.productId,
                    categorySlug: linkType !== 'category' ? null : formData.categorySlug,
                    linkUrl: linkType !== 'url' ? null : formData.linkUrl,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum link</SelectItem>
                  <SelectItem value="product">Link para Produto</SelectItem>
                  <SelectItem value="category">Link para Categoria</SelectItem>
                  <SelectItem value="url">URL Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Produto */}
            {formData.linkType === 'product' && (
              <div>
                <label className="block text-sm font-medium mb-1">Selecionar Produto</label>
                <Select
                  value={formData.productId || ''}
                  onValueChange={(value) => setFormData({ ...formData, productId: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Categoria */}
            {formData.linkType === 'category' && (
              <div>
                <label className="block text-sm font-medium mb-1">Selecionar Categoria</label>
                <Select
                  value={formData.categorySlug || ''}
                  onValueChange={(value) => setFormData({ ...formData, categorySlug: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.slug}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* URL personalizada */}
            {formData.linkType === 'url' && (
              <div>
                <label className="block text-sm font-medium mb-1">URL Personalizada</label>
                <Input
                  value={formData.linkUrl || ''}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value || null })}
                  placeholder="https://exemplo.com"
                />
              </div>
            )}

            {/* Tipo de exibição e ordem */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Exibição</label>
                <Select
                  value={formData.displayType}
                  onValueChange={(value) => setFormData({ ...formData, displayType: value as 'grid' | 'large' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid (4 quadrados)</SelectItem>
                    <SelectItem value="large">Imagem Grande</SelectItem>
                  </SelectContent>
                </Select>
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

            {/* Ordem de animação e ativo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ordem na Animação</label>
                <Input
                  type="number"
                  value={formData.animationOrder}
                  onChange={(e) => setFormData({ ...formData, animationOrder: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium">Imagem Ativa</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                <Save className="h-4 w-4 mr-2" />
                {editingImage ? 'Salvar Alterações' : 'Adicionar Imagem'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
