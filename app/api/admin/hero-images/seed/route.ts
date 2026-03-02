import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { connectToDatabase } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

// Imagens padrão do hero (as 4 imagens originais da página)
const DEFAULT_HERO_IMAGES = [
  {
    imageUrl:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
    alt: 'Fundação',
    order: 1,
    active: true,
    linkType: 'category' as const,
    productId: null,
    categorySlug: 'cimento-e-argamassa',
    linkUrl: null,
    displayType: 'grid' as const,
    animationOrder: 1,
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=800&auto=format&fit=crop',
    alt: 'Ferramentas Pro',
    order: 3,
    active: true,
    linkType: 'category' as const,
    productId: null,
    categorySlug: 'ferramentas',
    linkUrl: null,
    displayType: 'grid' as const,
    animationOrder: 3,
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
    alt: 'Elétrica',
    order: 2,
    active: true,
    linkType: 'category' as const,
    productId: null,
    categorySlug: 'material-eletrico',
    linkUrl: null,
    displayType: 'grid' as const,
    animationOrder: 2,
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?q=80&w=800&auto=format&fit=crop',
    alt: 'Acabamentos',
    order: 4,
    active: true,
    linkType: 'category' as const,
    productId: null,
    categorySlug: 'acabamentos',
    linkUrl: null,
    displayType: 'grid' as const,
    animationOrder: 4,
  },
];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = await connectToDatabase();
    const heroImagesCollection = db.collection('hero_images');

    // Verificar se já existem imagens (evitar duplicatas)
    const existingCount = await heroImagesCollection.countDocuments({});
    if (existingCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Já existem ${existingCount} imagens cadastradas. Seed não executado.`,
        existingCount,
      });
    }

    // Inserir as imagens padrão
    const now = new Date();
    const docsToInsert = DEFAULT_HERO_IMAGES.map((img) => ({
      ...img,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await heroImagesCollection.insertMany(docsToInsert);

    return NextResponse.json({
      success: true,
      message: `${result.insertedCount} imagens padrão adicionadas com sucesso.`,
      insertedCount: result.insertedCount,
    });
  } catch (error: any) {
    console.error('Erro ao executar seed de imagens do hero:', error);
    return NextResponse.json(
      { error: 'Erro ao executar seed de imagens do hero' },
      { status: 500 }
    );
  }
}
