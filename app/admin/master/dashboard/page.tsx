'use client';

import Link from 'next/link';
import { Users, Settings, ScrollText, Download, KeyRound, ArrowRight } from 'lucide-react';

const cards = [
  {
    href: '/admin/master/equipe',
    title: 'Equipe interna',
    desc: 'Criar funcionários e atribuir papéis. Clientes do site ficam em Admin → Clientes.',
    icon: Users,
  },
  {
    href: '/admin/master/configuracoes',
    title: 'Configurações globais',
    desc: 'Taxas, integrações DevNota, parâmetros do PDV e do site.',
    icon: Settings,
  },
  {
    href: '/admin/master/auditoria',
    title: 'Auditoria',
    desc: 'Registo completo de ações sensíveis (em implementação).',
    icon: ScrollText,
  },
  {
    href: '/admin/master/exportacao',
    title: 'Exportação de dados',
    desc: 'Exportar conjuntos completos para backup ou análise.',
    icon: Download,
  },
  {
    href: '/admin/master/senhas',
    title: 'Redefinição de senhas',
    desc: 'Equipa interna. Clientes: painel Admin → Clientes.',
    icon: KeyRound,
  },
];

export default function MasterDashboardPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Painel Master</h1>
      <p className="mb-8 max-w-2xl text-gray-600">
        Controlo de nível superior da Macofel. Cada módulo abaixo será ligado a APIs e políticas próprias;
        por agora serve como mapa da área exclusiva.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-400/60 hover:shadow-md"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-semibold text-gray-900">{title}</span>
            </div>
            <p className="mb-4 flex-1 text-sm text-gray-600">{desc}</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 group-hover:text-amber-900">
              Abrir
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
