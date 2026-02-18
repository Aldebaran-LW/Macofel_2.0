import { NextResponse } from 'next/server';
import { getHeroImages } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

// GET - Listar imagens ativas do hero (público)
export async function GET() {
  try {
    const images = await getHeroImages();
    return NextResponse.json(images);
  } catch (error: any) {
    console.error('Erro ao buscar imagens do hero:', error);
    // Retornar imagens padrão em caso de erro
    const defaultImages = [
      'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1000',
    ];
    return NextResponse.json(
      defaultImages.map((url, index) => ({
        id: `default-${index}`,
        imageUrl: url,
        alt: `Obra de Engenharia ${index + 1}`,
        order: index,
        active: true,
      }))
    );
  }
}
