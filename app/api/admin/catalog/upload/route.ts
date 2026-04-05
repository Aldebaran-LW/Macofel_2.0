import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  CATALOG_INTERNAL_SECRET,
  RENDER_CATALOG_AGENT_URL,
  RENDER_CATALOG_WEBHOOK_SECRET,
} from '@/env';
import { isAdminDashboardRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdminDashboardRole((session.user as { role?: string }).role)) {
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
          error: 'Arquivo muito grande (máx. 4.5 MB). Divida ou use importação clássica / servidor dedicado.',
        },
        { status: 400 }
      );
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!blobToken) {
      return NextResponse.json(
        {
          error:
            'Vercel Blob não está configurado. Crie um Blob Store no projeto Vercel e defina a variável de ambiente BLOB_READ_WRITE_TOKEN (Production / Preview / Development conforme o ambiente). Sem este token o upload para o agente não funciona.',
        },
        { status: 503 }
      );
    }

    const blob = await put(`catalog-import/${Date.now()}-${file.name}`, file, {
      access: 'private',
      addRandomSuffix: true,
      token: blobToken,
    });

    const origin = request.nextUrl.origin;
    const userId = (session.user as { id?: string }).id ?? null;

    if (RENDER_CATALOG_AGENT_URL) {
      const payload: Record<string, unknown> = {
        fileUrl: blob.url,
        fileName: file.name,
        importType: 'full-catalog',
        userId,
      };
      payload.blobReadToken = blobToken;

      const renderHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (RENDER_CATALOG_WEBHOOK_SECRET) {
        renderHeaders['X-Catalog-Webhook-Secret'] = RENDER_CATALOG_WEBHOOK_SECRET;
      }

      const renderRes = await fetch(RENDER_CATALOG_AGENT_URL, {
        method: 'POST',
        headers: renderHeaders,
        body: JSON.stringify(payload),
      });

      if (!renderRes.ok) {
        const detail = await renderRes.text().catch(() => '');
        return NextResponse.json(
          {
            error: `Agente no Render respondeu HTTP ${renderRes.status}`,
            details: detail.slice(0, 500),
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          'Ficheiro enviado. O agente no Render foi notificado; os produtos devem aparecer em «Pendentes de revisão» após o processamento.',
        nextStep:
          'Aceda a Estoque → Pendentes (IA) para rever e aprovar.',
        mode: 'render',
        fileUrl: blob.url,
      });
    }

    if (!CATALOG_INTERNAL_SECRET) {
      return NextResponse.json(
        {
          error:
            'Configure RENDER_CATALOG_AGENT_URL (agente no Render) ou CATALOG_INTERNAL_SECRET (processamento neste servidor).',
        },
        { status: 503 }
      );
    }

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
      message: 'Arquivo recebido. Processamento iniciado em segundo plano neste servidor.',
      nextStep: 'Consulte «Pendentes de revisão» quando o pipeline local terminar.',
      mode: 'internal',
      fileUrl: blob.url,
    });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
