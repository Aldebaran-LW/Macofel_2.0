'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Trash2, Edit2, Save, X, Eye, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface HeroImage {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminHeroImagesPage() {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<HeroImage>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newImage, setNewImage] = useState({ imageUrl: '', alt: 'Imagem do Hero', order: 0, active: true });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/hero-images');
      
      if (res.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        window.location.href = '/login';
        return;
      }
      
      if (res.status === 403) {
        toast.error('Acesso negado. Você precisa ser administrador.');
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
        if (data && data.length === 0) {
          toast.info('Nenhuma imagem cadastrada ainda.');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'Erro ao carregar imagens');
      }
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      toast.error('Erro de conexão ao carregar imagens');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = async () => {
    if (!newImage.imageUrl.trim()) {
      toast.error('URL da imagem é obrigatória');
      return;
    }

    try {
      const res = await fetch('/api/admin/hero-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newImage),
      });

      if (res.ok) {
        toast.success('Imagem adicionada com sucesso');
        setNewImage({ imageUrl: '', alt: 'Imagem do Hero', order: 0, active: true });
        setShowAddForm(false);
        fetchImages();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao adicionar imagem');
      }
    } catch (error) {
      console.error('Erro ao adicionar imagem:', error);
      toast.error('Erro ao adicionar imagem');
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta imagem?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/hero-images?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Imagem deletada com sucesso');
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

  const handleStartEdit = (image: HeroImage) => {
    setEditingId(image.id);
    setEditForm({
      imageUrl: image.imageUrl,
      alt: image.alt,
      order: image.order,
      active: image.active,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch('/api/admin/hero-images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });

      if (res.ok) {
        toast.success('Imagem atualizada com sucesso');
        setEditingId(null);
        setEditForm({});
        fetchImages();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao atualizar imagem');
      }
    } catch (error) {
      console.error('Erro ao atualizar imagem:', error);
      toast.error('Erro ao atualizar imagem');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Imagens do Hero</h1>
          <p className="text-gray-600 mt-2">Gerencie as imagens exibidas no hero da página inicial</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-bold"
        >
          <Plus className="w-5 h-5" />
          Adicionar Imagem
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Adicionar Nova Imagem</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Imagem
              </label>
              <input
                type="text"
                value={newImage.imageUrl}
                onChange={(e) => setNewImage({ ...newImage, imageUrl: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cole a URL da imagem (pode ser de um serviço de hospedagem como Imgur, Cloudinary, etc.)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto Alternativo
              </label>
              <input
                type="text"
                value={newImage.alt}
                onChange={(e) => setNewImage({ ...newImage, alt: e.target.value })}
                placeholder="Descrição da imagem"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordem
                </label>
                <input
                  type="number"
                  value={newImage.order}
                  onChange={(e) => setNewImage({ ...newImage, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="flex items-center gap-2 mt-8">
                <input
                  type="checkbox"
                  id="newActive"
                  checked={newImage.active}
                  onChange={(e) => setNewImage({ ...newImage, active: e.target.checked })}
                  className="w-4 h-4 text-red-600 focus:ring-red-600"
                />
                <label htmlFor="newActive" className="text-sm font-medium text-gray-700">
                  Ativa
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddImage}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Salvar
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewImage({ imageUrl: '', alt: 'Imagem do Hero', order: 0, active: true });
                }}
                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Total de imagens: <span className="font-bold text-gray-900">{images.length}</span>
          {' • '}
          Ativas: <span className="font-bold text-green-600">{images.filter(img => img.active).length}</span>
          {' • '}
          Inativas: <span className="font-bold text-gray-500">{images.filter(img => !img.active).length}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium mb-2">Nenhuma imagem cadastrada</p>
            <p className="text-sm text-gray-500 mb-4">Adicione uma imagem para começar a gerenciar o hero da página inicial</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeira Imagem
            </button>
          </div>
        ) : (
          images.map((image) => (
            <div
              key={image.id}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <div className="relative aspect-video bg-gray-100">
                {editingId === image.id ? (
                  <div className="p-4 space-y-4 h-full overflow-y-auto">
                    {/* Preview da imagem */}
                    {editForm.imageUrl && (
                      <div className="relative w-full h-32 mb-4 rounded-lg overflow-hidden border border-gray-200">
                        <Image
                          src={editForm.imageUrl}
                          alt="Preview"
                          fill
                          className="object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL da Imagem
                      </label>
                      <input
                        type="text"
                        value={editForm.imageUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Texto Alternativo
                      </label>
                      <input
                        type="text"
                        value={editForm.alt || ''}
                        onChange={(e) => setEditForm({ ...editForm, alt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ordem
                        </label>
                        <input
                          type="number"
                          value={editForm.order ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          checked={editForm.active ?? true}
                          onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                          className="w-4 h-4 text-red-600 focus:ring-red-600"
                        />
                        <label className="text-sm font-medium text-gray-700">Ativa</label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {image.imageUrl ? (
                      <Image
                        src={image.imageUrl}
                        alt={image.alt}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="flex items-center justify-center h-full text-gray-400">
                                <div class="text-center">
                                  <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                  <p class="text-xs">Erro ao carregar imagem</p>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                    )}
                    {!image.active && (
                      <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded font-bold">
                        Inativa
                      </div>
                    )}
                    {image.active && (
                      <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded font-bold">
                        Ativa
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-4">
                {editingId === image.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(image.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-900 mb-1 truncate" title={image.alt}>
                        {image.alt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Ordem: {image.order}</span>
                        <span className={`px-2 py-0.5 rounded ${image.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {image.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    {image.imageUrl && (
                      <a
                        href={image.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1"
                        title={image.imageUrl}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir imagem
                      </a>
                    )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(image)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        title="Deletar imagem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
