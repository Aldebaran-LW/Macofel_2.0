'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, RefreshCw, UserPlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ASSIGNABLE_ROLES, MASTER_STAFF_CREATION_ROLES, ROLE_LABELS } from '@/lib/master-role-policy';
import { isGerenteSiteRole, isMasterAdminRole, type UserRole } from '@/lib/permissions';
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

export default function AdminEquipePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const actorIsMaster = isMasterAdminRole(role);

  useEffect(() => {
    if (status === 'loading') return;
    if (role && isGerenteSiteRole(role)) {
      router.replace('/painel-loja/gestao-site/dashboard');
    }
  }, [role, status, router]);

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [creating, setCreating] = useState(false);
  const [pdvEdit, setPdvEdit] = useState<{ id: string; email: string; pdvUserName: string } | null>(null);
  const [pdvSaving, setPdvSaving] = useState(false);

  const load = useCallback(async () => {
    if (isGerenteSiteRole(role)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) {
        toast.error(res.status === 403 ? 'Acesso negado' : 'Erro ao carregar utilizadores');
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
  }, [role]);

  useEffect(() => {
    if (status === 'loading') return;
    if (role && isGerenteSiteRole(role)) return;
    void load();
  }, [load, role, status]);

  const handleRoleChange = async (user: StaffUser, newRole: UserRole) => {
    if (newRole === user.role) return;
    setUpdatingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === 'string' ? data.error : 'Não foi possível atualizar o role');
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: data.user?.role ?? newRole } : u)));
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
      const res = await fetch('/api/admin/users', {
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
      const res = await fetch(`/api/admin/users/${pdvEdit.id}`, {
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

  if (status !== 'loading' && role && isGerenteSiteRole(role)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
        A redirecionar…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Equipe interna</h1>
            <p className="text-sm text-gray-600">
              Apenas contas da loja (não-clientes). Quem se cadastra no site entra como <strong>Cliente</strong> e
              aparece no painel{' '}
              <Link href="/admin/clientes" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
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
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
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
                          {u.pdvUserName ?? <span className="text-gray-400">—</span>}
                        </span>
                        <button
                          type="button"
                          className="rounded p-1 text-emerald-700 hover:bg-emerald-50"
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
                          'max-w-[220px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500',
                          updatingId === u.id && 'opacity-60'
                        )}
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => void handleRoleChange(u, e.target.value as UserRole)}
                        aria-label={`Role de ${u.email}`}
                      >
                        {(actorIsMaster
                          ? ASSIGNABLE_ROLES
                          : ASSIGNABLE_ROLES.filter((r) => r !== 'MASTER_ADMIN')
                        ).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(u.createdAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo funcionário</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Senha</Label>
                <Input
                  id="pw"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fn">Nome</Label>
                <Input id="fn" value={createForm.firstName} onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ln">Sobrenome</Label>
                <Input id="ln" value={createForm.lastName} onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                >
                  {(actorIsMaster
                    ? MASTER_STAFF_CREATION_ROLES
                    : MASTER_STAFF_CREATION_ROLES.filter((r) => r !== 'MASTER_ADMIN')
                  ).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdv">User Name (PDV)</Label>
                <Input
                  id="pdv"
                  value={createForm.pdvUserName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, pdvUserName: e.target.value }))}
                  placeholder="ex.: vendedor"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input id="phone" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Criando…' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pdvEdit} onOpenChange={(o) => (o ? null : setPdvEdit(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar User Name (PDV)</DialogTitle>
          </DialogHeader>
          {pdvEdit ? (
            <form className="space-y-4" onSubmit={handleSavePdvUserName}>
              <p className="text-sm text-gray-600">
                Utilizador: <span className="font-medium text-gray-900">{pdvEdit.email}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="pdv2">User Name (PDV)</Label>
                <Input
                  id="pdv2"
                  value={pdvEdit.pdvUserName}
                  onChange={(e) => setPdvEdit((p) => (p ? { ...p, pdvUserName: e.target.value } : p))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPdvEdit(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pdvSaving}>
                  {pdvSaving ? 'Salvando…' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

