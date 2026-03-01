import { NextResponse } from 'next/server';
import { getHeroImages } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

// GET - Listar imagens ativas do hero (pública, sem autenticação)
export async function GET() {
  try {
    const images = await getHeroImages();
    
    // Separar imagens por tipo de display
    const gridImages = images
      .filter(img => img.displayType === 'grid')
      .sort((a, b) => (a.animationOrder ?? 0) - (b.animationOrder ?? 0));
    
    const largeImages = images
      .filter(img => img.displayType === 'large')
      .sort((a, b) => (a.animationOrder ?? 0) - (b.animationOrder ?? 0));

    return NextResponse.json({
      grid: gridImages,
      large: largeImages,
      all: images,
    });
  } catch (error: any) {
    console.error('Erro ao buscar imagens do hero:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar imagens do hero', images: [] },
      { status: 500 }
    );
  }
}
