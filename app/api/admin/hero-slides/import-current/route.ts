import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import { connectToDatabase } from '@/lib/mongodb-native';
import { HERO_DEFAULT_SLIDES } from '@/lib/hero-default-slides';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!canAccessAdminCatalogSession((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = await connectToDatabase();
    const heroSlidesCollection = db.collection('hero_slides');

    const existingCount = await heroSlidesCollection.countDocuments({});
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: true,
        message: 'Já existem slides cadastrados. Nenhum slide foi importado.',
      });
    }

    const now = new Date();
    const docs = HERO_DEFAULT_SLIDES.map((slide) => ({
      imageUrl: slide.imageUrl,
      subtitle: slide.subtitle ?? null,
      title: slide.title ?? null,
      text: slide.text ?? null,
      href: slide.href ?? null,
      order: slide.order ?? 0,
      active: slide.active ?? true,
      createdAt: now,
      updatedAt: now,
    }));

    if (docs.length > 0) {
      await heroSlidesCollection.insertMany(docs);
    }

    return NextResponse.json({
      success: true,
      imported: docs.length,
      skipped: false,
    });
  } catch (error) {
    console.error('Erro ao importar slides atuais do hero:', error);
    return NextResponse.json({ error: 'Erro ao importar slides atuais do hero' }, { status: 500 });
  }
}

