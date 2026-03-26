'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { KeyRound, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isMasterAdminRole, type UserRole } from '@/lib/permissions';

type Row = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export default function AdminSenhasPage() {
  const { data: session } = useSession();
  const actorIsMaster = isMasterAdminRole((session?.user as { role?: string } | undefined)?.role);
  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) {
        toast.error('Não foi possível carregar utilizadores');
        setUsers([]);
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error('Escolha um utilizador');
      return;
    }
    if (password.length < 8) {
      toast.error('Senha com pelo menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Confirmação não coincide');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao definir senha');
        return;
      }
      toast.success('Senha atualizada');
      setPassword('');
      setConfirm('');
    } catch {
      toast.error('Erro de rede');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Redefinição de senhas</h1>
            <p className="text-sm text-gray-600">
              Senhas da <strong>equipe interna</strong> (admins, PDV, etc.). Clientes do site: use o painel{' '}
              <strong>Admin → Clientes</strong> para editar ou redefinir.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar lista
        </Button>
      </div>

      <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="user">Utilizador</Label>
              <select
                id="user"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">— selecionar —</option>
                {users
                  .filter((u) => actorIsMaster || u.role !== 'MASTER_ADMIN')
                  .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Nova senha (8–128 caracteres)</Label>
              <Input
                id="pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirmar senha</Label>
              <Input
                id="pw2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'A guardar…' : 'Definir senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

