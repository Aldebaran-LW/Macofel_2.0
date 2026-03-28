'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { isAdminDashboardRole, isPainelLojaRole } from '@/lib/permissions';

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Se já estiver logado como admin, redirecionar
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      if (isAdminDashboardRole(role)) {
        router.push('/admin/dashboard');
      } else if (isPainelLojaRole(role)) {
        router.push('/painel-loja');
      } else if (role && !isAdminDashboardRole(role)) {
        signOut({ redirect: false });
      }
    }
  }, [router, session, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        toast.error('Credenciais inválidas. Acesso restrito a administradores.');
      } else {
        // Aguardar um pouco para a sessão ser atualizada e o token JWT ser processado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar novamente a sessão após login
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const sessionData = await res.json();
        
        const userRole = sessionData?.user ? (sessionData.user as any)?.role : null;
        
        if (isAdminDashboardRole(userRole)) {
          toast.success('Acesso autorizado');
          router.push('/admin/dashboard');
          router.refresh();
        } else if (isPainelLojaRole(userRole)) {
          toast.success('Redirecionando para o painel da loja…');
          router.push('/painel-loja');
          router.refresh();
        } else {
          toast.error('Acesso negado. Apenas administradores podem acessar esta área.');
          await signOut({ redirect: false });
          setFormData({ email: '', password: '' });
        }
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Card de Login Admin */}
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8">
          {/* Header Admin */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Painel Administrativo</h1>
            <p className="text-gray-400">Acesso restrito a administradores</p>
          </div>

          {/* Aviso de Segurança */}
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-200">Área Restrita</p>
                <p className="text-xs text-yellow-300/80 mt-1">
                  Apenas usuários com permissão de administrador podem acessar esta área.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email Administrativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@macofel.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  autoComplete="email"
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Verificando credenciais...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Acessar Painel Admin
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={() => {
                // Não fazer logout, apenas redirecionar para a homepage
                router.push('/');
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao site
            </button>
          </div>
        </div>

        {/* Informações de Credenciais */}
        <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400 text-center mb-2">Credenciais padrão:</p>
          <div className="text-xs text-gray-500 space-y-1 text-center">
            <p>Email: <span className="text-gray-300 font-mono">admin@macofel.com</span></p>
            <p>Senha: <span className="text-gray-300 font-mono">admin123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
