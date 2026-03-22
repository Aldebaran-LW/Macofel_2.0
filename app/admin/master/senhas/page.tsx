'use client';

import { KeyRound } from 'lucide-react';

export default function MasterSenhasPage() {
  return (
    <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <KeyRound className="h-8 w-8 text-amber-600" />
        <h1 className="text-xl font-bold text-gray-900">Redefinição de senhas</h1>
      </div>
      <p className="mb-4 text-gray-600">
        Permitir ao Master definir uma nova senha temporária para qualquer utilizador na tabela{' '}
        <code className="rounded bg-gray-100 px-1">users</code> (sempre com hash bcrypt no servidor).
      </p>
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
        <p className="mb-2 font-medium">Ferramenta já disponível em desenvolvimento</p>
        <p className="text-amber-900/90">
          Na raiz do projeto, com <code className="rounded bg-white/80 px-1">DATABASE_URL</code> no{' '}
          <code className="rounded bg-white/80 px-1">.env</code>:
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
          {`$env:MACOFEL_SET_EMAIL="email@exemplo.com"
$env:MACOFEL_SET_PASSWORD="nova_senha"
npm run set-user-password`}
        </pre>
        <p className="mt-2 text-amber-900/80">
          Em produção, substituir por formulário aqui + API protegida com{' '}
          <code className="rounded bg-white/80 px-1">requireMasterAdminSession</code>.
        </p>
      </div>
    </div>
  );
}
