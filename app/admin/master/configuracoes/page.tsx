'use client';

import { Settings } from 'lucide-react';

export default function MasterConfigPage() {
  return (
    <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Settings className="h-8 w-8 text-amber-600" />
        <h1 className="text-xl font-bold text-gray-900">Configurações globais</h1>
      </div>
      <p className="mb-4 text-gray-600">
        Taxas, integrações <strong>DevNota</strong>, chaves e comportamento do <strong>PDV</strong> (terminais,
        ambiente fiscal) devem ser centralizados aqui, com persistência em Postgres ou variáveis versionadas.
      </p>
      <p className="text-sm text-gray-500">
        Modelo sugerido: tabela <code className="rounded bg-gray-100 px-1">app_settings</code> (chave/valor JSON)
        ou env + painel só para master.
      </p>
    </div>
  );
}
