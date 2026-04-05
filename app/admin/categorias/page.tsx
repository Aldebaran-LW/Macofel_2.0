'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderTree, Plus, Edit, Trash2, Save, X, Layers, Loader2, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isRoot?: boolean;
  _count: { products: number };
}

interface SubcategoriaRow {
  label: string;
  count: number;
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [subModalCategory, setSubModalCategory] = useState<Category | null>(null);
  const [subRows, setSubRows] = useState<SubcategoriaRow[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subEditor, setSubEditor] = useState<{ original: string; value: string } | null>(null);
  const [subSaving, setSubSaving] = useState(false);

  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit') ?? null;

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const loadSubcategorias = useCallback(async (categoryId: string) => {
    setSubLoading(true);
    setSubEditor(null);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/subcategorias`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erro ao carregar subcategorias');
        setSubRows([]);
        return;
      }
      const data = await res.json();
      setSubRows(Array.isArray(data?.subcategorias) ? data.subcategorias : []);
    } catch {
      toast.error('Erro ao carregar subcategorias');
      setSubRows([]);
    } finally {
      setSubLoading(false);
    }
  }, []);

  const openSubModal = (category: Category) => {
    setSubModalCategory(category);
    void loadSubcategorias(category.id);
  };

  const closeSubModal = () => {
    setSubModalCategory(null);
    setSubRows([]);
    setSubEditor(null);
  };

  const applyRenameSubcategoria = async () => {
    if (!subModalCategory || !subEditor) return;
    const from = subEditor.original.trim();
    const to = subEditor.value.trim();
    if (!from) return;
    setSubSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${subModalCategory.id}/subcategorias`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: to || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Erro ao atualizar');
        return;
      }
      toast.success(data.updated > 0 ? `${data.updated} produto(s) atualizado(s).` : 'Nenhum produto com esse texto exato.');
      setSubEditor(null);
      await loadSubcategorias(subModalCategory.id);
    } catch {
      toast.error('Erro ao atualizar subcategorias');
    } finally {
      setSubSaving(false);
    }
  };

  const clearSubcategoria = async (label: string) => {
    if (!subModalCategory) return;
    if (!confirm(`Remover a subcategoria "${label}" de todos os produtos desta categoria?`)) return;
    setSubSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${subModalCategory.id}/subcategorias`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: label, to: '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Erro ao limpar');
        return;
      }
      toast.success(`${data.updated ?? 0} produto(s) atualizado(s).`);
      setSubEditor(null);
      await loadSubcategorias(subModalCategory.id);
    } catch {
      toast.error('Erro ao limpar subcategoria');
    } finally {
      setSubSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description || '' });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  useEffect(() => {
    if (loading || !editId || isDialogOpen) return;
    const cat = categories.find((c) => c.id === editId);
    if (cat) handleOpenDialog(cat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, editId, categories, isDialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('O nome da categoria é obrigatório');
      return;
    }

    try {
      const method = editingCategory ? 'PUT' : 'POST';
      const body: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };
      if (editingCategory) body.id = editingCategory.id;

      const res = await fetch('/api/categories', {
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
    if (!confirm(`Tem certeza que deseja deletar a categoria "${categoryName}"?`)) return;
    try {
      const res = await fetch('/api/categories', {
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
        <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Categoria
        </Button>
      </div>

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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-2">
                    <FolderTree className="h-5 w-5 text-red-600 mr-2 shrink-0" />
                    <h3 className="font-semibold text-lg truncate">{category.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mb-2 break-all">/{category.slug}</p>
                  {category.description && <p className="text-sm text-gray-600 mb-3">{category.description}</p>}
                  <p className="text-sm text-gray-500">
                    {category._count?.products || 0} produto{(category._count?.products || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button size="sm" variant="outline" onClick={() => handleOpenDialog(category)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => openSubModal(category)}>
                  <Layers className="h-4 w-4 mr-1" />
                  Subcategorias
                </Button>
                {!category.isRoot && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(category.id, category.name)}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</DialogTitle>
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
              <p className="text-xs text-gray-500 mt-1">O slug é gerado automaticamente no backend.</p>
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

      <Dialog
        open={subModalCategory != null}
        onOpenChange={(open) => {
          if (!open) closeSubModal();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-red-600" />
              Subcategorias — {subModalCategory?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 min-h-0 border rounded-md">
            {subLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                A carregar...
              </div>
            ) : subRows.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">Nenhuma subcategoria encontrada.</p>
            ) : (
              <ul className="divide-y text-sm">
                {subRows.map((row) => (
                  <li key={row.label} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 break-words">{row.label}</p>
                      <p className="text-xs text-gray-500">{row.count} produto(s)</p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={subSaving}
                        onClick={() => setSubEditor({ original: row.label, value: row.label })}
                      >
                        Renomear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-amber-700 hover:bg-amber-50"
                        disabled={subSaving}
                        onClick={() => clearSubcategoria(row.label)}
                      >
                        <Eraser className="h-3.5 w-3.5 mr-1" />
                        Limpar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {subEditor && (
            <div className="border-t pt-4 space-y-3 bg-gray-50 -mx-6 px-6 pb-2 rounded-b-lg">
              <p className="text-xs text-gray-500 break-all">
                Valor original: <span className="font-mono">{subEditor.original}</span>
              </p>
              <Input
                value={subEditor.value}
                onChange={(e) => setSubEditor({ ...subEditor, value: e.target.value })}
                placeholder="Novo nome da subcategoria"
                disabled={subSaving}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={subSaving}
                  onClick={() => void applyRenameSubcategoria()}
                >
                  {subSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Aplicar</>}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={subSaving} onClick={() => setSubEditor(null)}>
                  Cancelar edição
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={closeSubModal}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
