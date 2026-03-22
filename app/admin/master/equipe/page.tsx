'use client';

import { Users } from 'lucide-react';

export default function MasterEquipePage() {
  return (
    <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Users className="h-8 w-8 text-amber-600" />
        <h1 className="text-xl font-bold text-gray-900">Equipe & roles</h1>
      </div>
      <p className="mb-4 text-gray-600">
        Aqui irá ficar a gestão de <strong>Administradores</strong> e <strong>Master Admins</strong>, bem como
        atribuição de roles (<code className="rounded bg-gray-100 px-1 text-sm">SELLER</code>,{' '}
        <code className="rounded bg-gray-100 px-1 text-sm">STORE_MANAGER</code>, etc.) com validação no servidor.
      </p>
      <p className="text-sm text-gray-500">
        Próximo passo sugerido: API <code className="rounded bg-gray-100 px-1">PATCH /api/admin/users/[id]/role</code>{' '}
        protegida com <code className="rounded bg-gray-100 px-1">requireMasterAdminSession</code>.
      </p>
    </div>
  );
}
