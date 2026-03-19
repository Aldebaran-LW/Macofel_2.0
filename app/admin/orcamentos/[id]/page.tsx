import { Suspense } from 'react';
import OrcamentoDetailContent from './orcamento-detail-content';

function Fallback() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );
}

export default function OrcamentoDetailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <OrcamentoDetailContent />
    </Suspense>
  );
}
