'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Mail, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ConfiguracoesPage() {
  const { data: session, status } = useSession() ?? {};
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: true,
    orderUpdates: true,
    language: 'pt-BR',
    theme: 'light',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      // Carregar configurações do usuário
      // Você pode criar uma API para isso depois
    }
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Implementar lógica de salvar configurações
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">
          Gerencie suas preferências e notificações
        </p>
      </div>

      <div className="space-y-6">
        {/* Notificações */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Notificações
            </h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Notificações por email</span>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, emailNotifications: e.target.checked })
                }
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Notificações por SMS</span>
              </div>
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, smsNotifications: e.target.checked })
                }
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Emails de marketing</span>
              </div>
              <input
                type="checkbox"
                checked={settings.marketingEmails}
                onChange={(e) =>
                  setSettings({ ...settings, marketingEmails: e.target.checked })
                }
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Atualizações de pedidos</span>
              </div>
              <input
                type="checkbox"
                checked={settings.orderUpdates}
                onChange={(e) =>
                  setSettings({ ...settings, orderUpdates: e.target.checked })
                }
                className="rounded"
              />
            </label>
          </div>
        </div>

        {/* Preferências */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Preferências
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="language">Idioma</Label>
              <select
                id="language"
                value={settings.language}
                onChange={(e) =>
                  setSettings({ ...settings, language: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>

            <div>
              <Label htmlFor="theme">Tema</Label>
              <select
                id="theme"
                value={settings.theme}
                onChange={(e) =>
                  setSettings({ ...settings, theme: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
                <option value="system">Sistema</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacidade */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Privacidade e Segurança
            </h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-600">
              Suas informações estão seguras conosco. Para mais informações sobre como
              protegemos seus dados, consulte nossa{' '}
              <a href="#" className="text-red-600 hover:text-red-700">
                Política de Privacidade
              </a>
              .
            </p>
            <Button variant="outline" className="w-full">
              Baixar meus dados
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  );
}
