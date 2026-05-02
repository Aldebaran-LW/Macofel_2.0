'use client';

import { TelegramLinkPanel } from '@/components/telegram-link-panel';

export default function AdminTelegramPage() {
  return (
    <TelegramLinkPanel
      title="Telegram"
      lead="Vincule a sua conta do painel ao bot"
      showEnvHint
    />
  );
}
