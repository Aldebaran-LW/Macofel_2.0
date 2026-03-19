'use client';

import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatCpf, isValidCpf, normalizeCpf } from '@/lib/cpf';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cpf?: string | null;
  phone?: string;
  address?: string;
  createdAt: string;
}

export default function AdminClientesPage() {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    cpf: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data ?? []);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      cpf: '',
      phone: '',
      address: '',
    });
  };

  const handleOpenDialog = () => {
    setEditingId(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (client: User) => {
    setEditingId(client.id);
    setFormData({
      email: client.email,
      password: '',
      firstName: client.firstName,
      lastName: client.lastName,
      cpf: client.cpf ? formatCpf(client.cpf) : '',
      phone: client.phone ?? '',
      address: client.address ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cpfClean = normalizeCpf(formData.cpf);
    if (!formData.email || !formData.firstName || !formData.lastName || !cpfClean) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!editingId && !formData.password) {
      toast.error('Informe a senha para novo cliente');
      return;
    }

    if (!isValidCpf(cpfClean)) {
      toast.error('CPF inválido');
      return;
    }

    try {
      if (editingId) {
        const body: Record<string, unknown> = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          cpf: cpfClean,
          phone: formData.phone || null,
          address: formData.address || null,
        };
        if (formData.password.trim()) {
          body.password = formData.password;
        }

        const res = await fetch(`/api/admin/clients/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success('Cliente atualizado!');
          handleCloseDialog();
          fetchClients();
        } else {
          toast.error(data.error || 'Erro ao atualizar cliente');
        }
        return;
      }

      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          cpf: cpfClean,
          phone: formData.phone || null,
          address: formData.address || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Cliente criado com sucesso!');
        handleCloseDialog();
        fetchClients();
      } else {
        toast.error(data.error || 'Erro ao criar cliente');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error(editingId ? 'Erro ao atualizar cliente' : 'Erro ao criar cliente');
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/clients/${deleteId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir');
      }
      toast.success('Cliente excluído');
      setDeleteId(null);
      fetchClients();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;
  }

  return (
    <div>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cadastro será removido (pedidos e carrinho vinculados também, conforme o banco de dados).
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteClient();
              }}
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Clientes Cadastrados</h1>
        <Button onClick={handleOpenDialog} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum cliente cadastrado</h3>
          <p className="text-gray-600">Os clientes aparecerão aqui quando se cadastrarem</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div key={client.id} className="bg-white rounded-lg shadow p-6 flex flex-col">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-semibold text-lg">
                  {client.firstName} {client.lastName}
                </h3>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => handleOpenEdit(client)}
                    aria-label="Editar cliente"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => setDeleteId(client.id)}
                    aria-label="Excluir cliente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600 flex-1">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  {client.email}
                </div>
                {client.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {client.phone}
                  </div>
                )}
                {client.cpf && (
                  <div className="flex items-center">
                    <span className="text-xs font-bold mr-2 text-gray-500">CPF:</span>
                    <span>{client.cpf}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                    {client.address}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  Cadastrado em: {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para Criar Cliente */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar cliente' : 'Adicionar novo cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Nome"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sobrenome <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Sobrenome"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@exemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Senha {!editingId && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingId ? 'Deixe em branco para manter a atual' : 'Mínimo 6 caracteres'}
                required={!editingId}
                minLength={editingId ? undefined : 6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Telefone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                CPF <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00"
                required
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Endereço</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Salvar alterações' : 'Criar cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
