'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Trash2, Edit2, Save, X, Upload } from 'lucide-react';
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
      const res = await fetch('/api/admin/hero-images');
      if (res.ok) {
        const data = await res.json();
        setImages(data ?? []);
      } else {
        toast.error('Erro ao carregar imagens');
      }
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      toast.error('Erro ao carregar imagens');
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Nenhuma imagem cadastrada. Adicione uma imagem para começar.
          </div>
        ) : (
          images.map((image) => (
            <div
              key={image.id}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <div className="relative aspect-video bg-gray-100">
                {editingId === image.id ? (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL da Imagem
                      </label>
                      <input
                        type="text"
                        value={editForm.imageUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
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
                    <Image
                      src={image.imageUrl}
                      alt={image.alt}
                      fill
                      className="object-cover"
                    />
                    {!image.active && (
                      <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                        Inativa
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
                    <p className="text-sm font-medium text-gray-900 mb-1">{image.alt}</p>
                    <p className="text-xs text-gray-500 mb-3">Ordem: {image.order}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(image)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
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
