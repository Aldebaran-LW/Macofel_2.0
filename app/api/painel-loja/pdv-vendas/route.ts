import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { connectToDatabase } from '@/lib/mongodb-native';
import { isPainelLojaRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string; pdvUserName?: string | null } | undefined)?.role;
  const pdvUserName = (session?.user as { pdvUserName?: string | null } | undefined)?.pdvUserName;

  if (!session?.user || !isPainelLojaRole(role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 40)));

  try {
    const db = await connectToDatabase();
    const sales = db.collection('pdv_sales');

    const filter: Record<string, unknown> = {};

    if (role === 'SELLER') {
      const key = String(pdvUserName ?? '').trim();
      if (!key) {
        return NextResponse.json({
          items: [],
          warning:
            'Defina o User Name PDV na sua conta (Admin → Equipe) para filtrar as suas vendas sincronizadas.',
        });
      }
      filter.operador = { $regex: new RegExp(`^${escapeRegex(key)}$`, 'i') };
    }

    const cursor = sales
      .find(filter)
      .sort({ receivedAt: -1 })
      .limit(limit);

    const docs = await cursor.toArray();

    const items = docs.map((doc) => {
      const itens = Array.isArray(doc.itens) ? doc.itens : [];
      return {
        pdvVendaId: String(doc.pdvVendaId ?? ''),
        numero: doc.numero ?? null,
        dataHora: doc.dataHora ?? null,
        total: typeof doc.total === 'number' ? doc.total : Number(doc.total) || 0,
        formaPagamento: doc.formaPagamento ?? '',
        operador: doc.operador ?? null,
        terminal: doc.terminal ?? null,
        status: doc.status ?? '',
        itemCount: itens.length,
        receivedAt: doc.receivedAt ? new Date(doc.receivedAt).toISOString() : null,
        voidedAt: doc.voidedAt ? new Date(doc.voidedAt).toISOString() : null,
      };
    });

    return NextResponse.json({
      items,
      scope: role === 'STORE_MANAGER' ? 'loja' : 'operador',
    });
  } catch (e) {
    console.error('[painel-loja/pdv-vendas]', e);
    return NextResponse.json({ error: 'Erro ao listar vendas' }, { status: 500 });
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
