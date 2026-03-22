'use client';

import { ScrollText } from 'lucide-react';

export default function MasterAuditoriaPage() {
  return (
    <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <ScrollText className="h-8 w-8 text-amber-600" />
        <h1 className="text-xl font-bold text-gray-900">Logs de auditoria</h1>
      </div>
      <p className="mb-4 text-gray-600">
        Visualização completa de eventos: alterações de preço, pedidos, roles, login falhado, exportações, etc.
      </p>
      <p className="text-sm text-gray-500">
        Implementação típica: middleware ou hooks Prisma que escrevem em{' '}
        <code className="rounded bg-gray-100 px-1">audit_log</code> com <code className="rounded bg-gray-100 px-1">actorId</code>,{' '}
        <code className="rounded bg-gray-100 px-1">action</code>, <code className="rounded bg-gray-100 px-1">payload</code>.
      </p>
    </div>
  );
}
