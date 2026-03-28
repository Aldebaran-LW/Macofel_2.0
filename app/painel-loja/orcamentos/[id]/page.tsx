import { Suspense } from 'react';
import OrcamentoDetailContent from '@/app/admin/orcamentos/[id]/orcamento-detail-content';

function Fallback() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
    </div>
  );
}

export default function PainelLojaOrcamentoDetailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <OrcamentoDetailContent />
    </Suspense>
  );
}
