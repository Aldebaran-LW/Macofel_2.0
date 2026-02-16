import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { connectToDatabase } from '@/lib/mongodb-native';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantidade inválida' },
        { status: 400 }
      );
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: params?.itemId },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item não encontrado' },
        { status: 404 }
      );
    }

    // Buscar produto do MongoDB para verificar estoque
    const db = await connectToDatabase();
    const productsCollection = db.collection('products');
    
    let productId: ObjectId;
    try {
      productId = new ObjectId(item.productId);
    } catch {
      return NextResponse.json(
        { error: 'ID do produto inválido' },
        { status: 400 }
      );
    }

    const product = await productsCollection.findOne({ _id: productId });

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    if (quantity > (product.stock ?? 0)) {
      return NextResponse.json(
        { error: 'Estoque insuficiente' },
        { status: 400 }
      );
    }

    await prisma.cartItem.update({
      where: { id: params?.itemId },
      data: { quantity },
    });

    return NextResponse.json({ message: 'Quantidade atualizada' });
  } catch (error: any) {
    console.error('Erro ao atualizar item:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    await prisma.cartItem.delete({
      where: { id: params?.itemId },
    });

    return NextResponse.json({ message: 'Item removido' });
  } catch (error: any) {
    console.error('Erro ao remover item:', error);
    return NextResponse.json(
      { error: 'Erro ao remover item' },
      { status: 500 }
    );
  }
}
