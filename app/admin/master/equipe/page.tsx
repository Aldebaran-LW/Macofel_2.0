'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, RefreshCw, UserPlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ASSIGNABLE_ROLES,
  MASTER_STAFF_CREATION_ROLES,
  ROLE_LABELS,
} from '@/lib/master-role-policy';
import type { UserRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type StaffUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  pdvUserName: string | null;
  cpf: string | null;
  phone: string | null;
  createdAt: string;
};

const defaultCreateForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'SELLER' as UserRole,
  pdvUserName: '',
  phone: '',
};

export default function MasterEquipePage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [creating, setCreating] = useState(false);
  const [pdvEdit, setPdvEdit] = useState<{
    id: string;
    email: string;
    pdvUserName: string;
  } | null>(null);
  const [pdvSaving, setPdvSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/master/users', { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('Acesso negado');
        } else {
          toast.error('Erro ao carregar utilizadores');
        }
        setUsers([]);
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar utilizadores');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRoleChange = async (user: StaffUser, newRole: UserRole) => {
    if (newRole === user.role) return;
    setUpdatingId(user.id);
    try {
      const res = await fetch(`/api/admin/master/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === 'string' ? data.error : 'Não foi possível atualizar o role');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: data.user?.role ?? newRole } : u))
      );
      toast.success('Role atualizado');
    } catch {
      toast.error('Erro de rede');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/master/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          role: createForm.role,
          pdvUserName: createForm.pdvUserName.trim(),
          phone: createForm.phone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === 'string' ? data.error : 'Erro ao criar');
        return;
      }
      toast.success('Funcionário criado');
      setCreateOpen(false);
      setCreateForm(defaultCreateForm);
      void load();
    } catch {
      toast.error('Erro de rede');
    } finally {
      setCreating(false);
    }
  };

  const handleSavePdvUserName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdvEdit) return;
    setPdvSaving(true);
    try {
      const res = await fetch(`/api/admin/master/users/${pdvEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdvUserName: pdvEdit.pdvUserName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === 'string' ? data.error : 'Erro ao guardar');
        return;
      }
      toast.success('User Name atualizado');
      setPdvEdit(null);
      void load();
    } catch {
      toast.error('Erro de rede');
    } finally {
      setPdvSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Equipe interna</h1>
            <p className="text-sm text-gray-600">
              Apenas contas da loja (não-clientes). Quem se cadastra no site entra como{' '}
              <strong>Cliente</strong> e aparece no painel{' '}
              <Link href="/admin/clientes" className="font-medium text-amber-800 underline-offset-2 hover:underline">
                Admin → Clientes
              </Link>
              . Cada funcionário tem <strong>User Name</strong> único no PDV (mesma senha do login por email).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="default" size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo funcionário
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Nenhum utilizador encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">User Name (PDV)</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-gray-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-800">
                          {u.pdvUserName ?? (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="rounded p-1 text-amber-700 hover:bg-amber-50"
                          title="Editar User Name (PDV)"
                          onClick={() =>
                            setPdvEdit({
                              id: u.id,
                              email: u.email,
                              pdvUserName: u.pdvUserName ?? '',
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={cn(
                          'max-w-[220px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500',
                          updatingId === u.id && 'opacity-60'
                        )}
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => void handleRoleChange(u, e.target.value as UserRole)}
                        aria-label={`Role de ${u.email}`}
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(u.createdAt).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo funcionário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div>
              <Label htmlFor="eq-email">Email (login no site)</Label>
              <Input
                id="eq-email"
                type="email"
                required
                autoComplete="off"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="eq-pdv">User Name (login no PDV)</Label>
              <Input
                id="eq-pdv"
                required
                placeholder="ex: lucas"
                autoComplete="off"
                className="font-mono"
                value={createForm.pdvUserName}
                onChange={(e) => setCreateForm((f) => ({ ...f, pdvUserName: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Único na empresa. 2–32 caracteres: letras minúsculas, números, _ e -
              </p>
            </div>
            <div>
              <Label htmlFor="eq-pass">Senha (mesma no site e no PDV)</Label>
              <Input
                id="eq-pass"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="eq-fn">Nome</Label>
                <Input
                  id="eq-fn"
                  required
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="eq-ln">Sobrenome</Label>
                <Input
                  id="eq-ln"
                  required
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="eq-role">Função</Label>
              <select
                id="eq-role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))
                }
              >
                {MASTER_STAFF_CREATION_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="eq-phone">Telefone (opcional)</Label>
              <Input
                id="eq-phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'A criar…' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pdvEdit} onOpenChange={(o) => !o && setPdvEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar User Name (PDV)</DialogTitle>
          </DialogHeader>
          {pdvEdit && (
            <form onSubmit={handleSavePdvUserName} className="space-y-3">
              <p className="text-sm text-gray-600">{pdvEdit.email}</p>
              <div>
                <Label htmlFor="pdv-edit">User Name</Label>
                <Input
                  id="pdv-edit"
                  required
                  className="font-mono"
                  value={pdvEdit.pdvUserName}
                  onChange={(e) => setPdvEdit((s) => (s ? { ...s, pdvUserName: e.target.value } : s))}
                />
                <p className="mt-1 text-xs text-gray-500">
                  2–32 caracteres: minúsculas, números, _ e -
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPdvEdit(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pdvSaving}>
                  {pdvSaving ? 'A guardar…' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
