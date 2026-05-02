'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { TelegramLinkPanel } from '@/components/telegram-link-panel';
import { isAdminDashboardRole, isPainelLojaRole } from '@/lib/permissions';

export default function EquipaTelegramPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const showPainelLoja = isPainelLojaRole(role);
  const showAdmin = isAdminDashboardRole(role);

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {showPainelLoja && (
          <Link
            href="/painel-loja"
            className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            ← Painel da loja
          </Link>
        )}
        {showAdmin && (
          <Link href="/admin/dashboard" className="font-semibold text-slate-700 hover:underline">
            ← Área admin
          </Link>
        )}
        <Link href="/" className="text-red-600 hover:underline">
          ← Início (site)
        </Link>
      </nav>
      <TelegramLinkPanel
        title="Telegram"
        lead="Qualquer funcionário com conta no site pode gerar aqui o código para vincular o bot"
      />
    </div>
  );
}
