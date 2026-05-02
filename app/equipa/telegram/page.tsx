'use client';

import Link from 'next/link';
import { TelegramLinkPanel } from '@/components/telegram-link-panel';

export default function EquipaTelegramPage() {
  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600">
        <Link href="/" className="text-red-600 hover:underline">
          ← Início
        </Link>
      </nav>
      <TelegramLinkPanel
        title="Telegram"
        lead="Qualquer funcionário com conta no site pode gerar aqui o código para vincular o bot"
      />
    </div>
  );
}
