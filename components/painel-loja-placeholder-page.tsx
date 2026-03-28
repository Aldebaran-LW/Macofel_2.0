import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  backHref?: string;
  backLabel?: string;
  title: string;
  children: React.ReactNode;
};

export function PainelLojaPlaceholderPage({
  backHref = '/painel-loja',
  backLabel = 'Voltar ao painel',
  title,
  children,
}: Props) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-800 hover:text-emerald-950"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{title}</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">{children}</div>
    </div>
  );
}
