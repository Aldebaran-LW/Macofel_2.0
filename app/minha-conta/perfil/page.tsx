'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { User, Mail, Phone, MapPin, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PerfilPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession() ?? {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para acessar seu perfil');
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      fetchUserData();
    }
  }, [status, session]);

  const fetchUserData = async () => {
    try {
      const userId = (session?.user as any)?.id;
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserData({
          firstName: data?.firstName ?? '',
          lastName: data?.lastName ?? '',
          email: data?.email ?? '',
          phone: data?.phone ?? '',
          address: data?.address ?? '',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const userId = (session?.user as any)?.id;
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        toast.success('Perfil atualizado com sucesso!');
        if (update) {
          await update();
        }
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao atualizar perfil');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        toast.success('Senha alterada com sucesso!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setShowPasswordForm(false);
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao alterar senha');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-600 mt-2">
          Gerencie suas informações pessoais
        </p>
      </div>

      <div className="space-y-6">
        {/* Informações Pessoais */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Informações Pessoais
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nome</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="firstName"
                    value={userData.firstName}
                    onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lastName">Sobrenome</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="lastName"
                    value={userData.lastName}
                    onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={userData.email}
                  disabled
                  className="pl-10 bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={userData.phone}
                  onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Endereço</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="address"
                  placeholder="Rua, Número - Cidade/Estado"
                  value={userData.address}
                  onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Salvando...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Save className="h-5 w-5 mr-2" />
                  Salvar Alterações
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Alterar Senha */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Segurança
            </h2>
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              <Lock className="h-4 w-4 mr-2" />
              {showPasswordForm ? 'Cancelar' : 'Alterar Senha'}
            </Button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  required
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={saving}
              >
                {saving ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
