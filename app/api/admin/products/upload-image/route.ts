import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import { uploadImage } from '@/lib/gridfs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!canAccessAdminCatalogSession(userRole)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP' },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB' },
        { status: 400 }
      );
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `product_${timestamp}.${extension}`;

    // Upload para GridFS
    const fileId = await uploadImage(buffer, filename, {
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedAt: new Date(),
    });

    // Retornar URL para acessar a imagem
    const imageUrl = `/api/images/${fileId}`;

    return NextResponse.json({
      success: true,
      fileId,
      imageUrl,
      filename,
    });
  } catch (error: any) {
    console.error('Erro ao fazer upload da imagem:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload da imagem' },
      { status: 500 }
    );
  }
}
