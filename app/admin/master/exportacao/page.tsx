'use client';

import { Download } from 'lucide-react';

export default function MasterExportacaoPage() {
  return (
    <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Download className="h-8 w-8 text-amber-600" />
        <h1 className="text-xl font-bold text-gray-900">Exportação de dados</h1>
      </div>
      <p className="mb-4 text-gray-600">
        Exportações completas (utilizadores, pedidos, produtos MongoDB, vendas PDV) com rate limit e registo de
        auditoria.
      </p>
      <p className="text-sm text-gray-500">
        Pode combinar jobs assíncronos (fila) para volumes grandes e download por link temporário seguro.
      </p>
    </div>
  );
}
