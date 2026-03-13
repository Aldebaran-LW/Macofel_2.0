import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await getCategories();

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar categorias',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
