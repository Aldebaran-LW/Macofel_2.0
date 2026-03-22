'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/lib/master-role-policy';
import type { UserRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type StaffUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  cpf: string | null;
  phone: string | null;
  createdAt: string;
};

export default function MasterEquipePage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Equipe & roles</h1>
            <p className="text-sm text-gray-600">
              Apenas Master Admin. Não é possível remover o último Master Admin sem promover outro antes.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
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
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
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
    </div>
  );
}
