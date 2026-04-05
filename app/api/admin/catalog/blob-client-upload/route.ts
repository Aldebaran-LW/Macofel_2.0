import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminDashboardRole((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!blobToken) {
    return NextResponse.json(
      {
        error:
          'Vercel Blob não está configurado (BLOB_READ_WRITE_TOKEN). Sem este token o upload direto do cliente não funciona.',
      },
      { status: 503 }
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      token: blobToken,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/pdf',
            'application/octet-stream',
          ],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro no upload';
    console.error('[blob-client-upload]', e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
