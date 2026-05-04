import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/gridfs';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';
import { writeAuditLogDeferred } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

/**
 * Upload de imagem via bot (multipart/form-data, campo "file").
 * Retorna URL interna `/api/images/:fileId` para ser anexada no produto.
 */
export async function POST(req: NextRequest) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `telegram_product_${timestamp}.${ext}`;

    const fileId = await uploadImage(buffer, filename, {
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: {
        userId: linked.user.userId,
        email: linked.user.email,
        role: linked.user.role,
        telegramUserId: linked.user.telegramUserId,
      },
    });

    const imageUrl = `/api/images/${fileId}`;
    writeAuditLogDeferred({
      source: 'telegram',
      actorId: linked.user.userId,
      actorEmail: linked.user.email,
      action: 'telegram.product.image_uploaded',
      targetType: 'gridfs_image',
      targetId: fileId,
      metadata: {
        filename,
        mimeType: file.type,
        size: file.size,
        telegramUserId: linked.user.telegramUserId,
      },
    });
    return NextResponse.json({ success: true, fileId, imageUrl, filename });
  } catch (error: unknown) {
    console.error('[api/telegram/products/upload-image]', error);
    return NextResponse.json({ error: 'Erro ao fazer upload da imagem' }, { status: 500 });
  }
}

