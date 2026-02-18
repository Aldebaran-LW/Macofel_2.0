import { NextRequest, NextResponse } from 'next/server';
import { getImageStream, getImageInfo } from '@/lib/gridfs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'ID do arquivo não fornecido' },
        { status: 400 }
      );
    }

    // Buscar informações do arquivo
    const fileInfo = await getImageInfo(fileId);
    if (!fileInfo) {
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      );
    }

    // Buscar stream da imagem
    const stream = await getImageStream(fileId);
    if (!stream) {
      return NextResponse.json(
        { error: 'Erro ao carregar imagem' },
        { status: 500 }
      );
    }

    // Converter stream para buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Retornar imagem com headers apropriados
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fileInfo.metadata?.mimeType || 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Erro ao servir imagem:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar imagem' },
      { status: 500 }
    );
  }
}
