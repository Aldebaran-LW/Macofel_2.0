import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { CATALOG_INTERNAL_SECRET } from '@/env';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !['MASTER_ADMIN', 'ADMIN'].includes((session.user.role as string) || '')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: 'Arquivo muito grande (máx. 4.5 MB). Divida ou use link direto.',
        },
        { status: 400 }
      );
    }

    const blob = await put(`catalog-import/${Date.now()}-${file.name}`, file, {
      access: 'private',
      addRandomSuffix: true,
    });

    if (!CATALOG_INTERNAL_SECRET) {
      return NextResponse.json(
        {
          error:
            'CATALOG_INTERNAL_SECRET não configurado. Defina no .env para permitir processamento em segundo plano.',
        },
        { status: 503 }
      );
    }

    const origin = request.nextUrl.origin;
    const userId = (session.user as { id?: string }).id;

    void fetch(`${origin}/api/admin/catalog/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-catalog-secret': CATALOG_INTERNAL_SECRET,
      },
      body: JSON.stringify({
        fileUrl: blob.url,
        fileName: file.name,
        userId,
      }),
    }).catch((err) => console.error('[catalog/upload] Background job falhou:', err));

    return NextResponse.json({
      success: true,
      message: 'Arquivo recebido. Processamento iniciado em segundo plano.',
      fileUrl: blob.url,
    });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
