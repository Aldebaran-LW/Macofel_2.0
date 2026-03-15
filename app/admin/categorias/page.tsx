'use client';

import { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, Save, X } from 'lucide-react';
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
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count: { products: number };
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data ?? []);
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
    setEditingCategory(null);
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
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

    if (!formData.name.trim()) {
      toast.error('O nome da categoria é obrigatório');
      return;
    }

    try {
      const url = editingCategory
        ? `/api/categories`
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const body: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };

      if (editingCategory) {
        body.id = editingCategory.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingCategory ? 'Categoria atualizada!' : 'Categoria criada!');
        handleCloseDialog();
        fetchCategories();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao salvar categoria');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar categoria');
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a categoria "${categoryName}"?\n\nIsso não deletará os produtos, apenas a categoria.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryId }),
      });

      if (res.ok) {
        toast.success('Categoria deletada!');
        fetchCategories();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao deletar categoria');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao deletar categoria');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando categorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
        <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Categoria
        </Button>
      </div>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FolderTree className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma categoria cadastrada</h3>
          <p className="text-gray-600 mb-6">Adicione categorias para organizar seus produtos</p>
          <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeira Categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <FolderTree className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {category._count?.products || 0} produto{(category._count?.products || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDialog(category)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(category.id, category.name)}
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

      {/* Dialog para Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nome da Categoria <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Cimento e Argamassa"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                O slug será gerado automaticamente a partir do nome
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a categoria (opcional)..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                <Save className="h-4 w-4 mr-2" />
                {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
