import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/get-authenticated-user-id';
import { connectToDatabase } from '@/lib/mongodb-native';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// Função auxiliar para buscar produtos do MongoDB e adicionar aos itens do carrinho
async function enrichCartItems(cartItems: any[]) {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  const categoriesCollection = db.collection('categories');

  const itemsWithProducts = await Promise.all(
    cartItems.map(async (item) => {
      let productId: ObjectId;
      try {
        productId = new ObjectId(item.productId);
      } catch {
        return { ...item, product: null };
      }

      const product = await productsCollection.findOne({ _id: productId });
      
      if (!product) {
        return { ...item, product: null };
      }

      // Buscar categoria
      let category = null;
      if (product.categoryId) {
        const categoryId = typeof product.categoryId === 'string' 
          ? new ObjectId(product.categoryId) 
          : product.categoryId;
        category = await categoriesCollection.findOne({ _id: categoryId });
      }

      return {
        ...item,
        product: {
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          featured: product.featured,
          category: category
            ? {
                id: category._id.toString(),
                name: category.name,
                slug: category.slug,
              }
            : null,
        },
      };
    })
  );

  return itemsWithProducts;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: true,
        },
      });
    }

    // Enriquecer itens com produtos do MongoDB
    const itemsWithProducts = await enrichCartItems(cart.items);

    return NextResponse.json({
      ...cart,
      items: itemsWithProducts,
    });
  } catch (error: any) {
    console.error('Erro ao buscar carrinho:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar carrinho' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const body = await req.json();
    const { productId, quantity } = body;

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Verificar estoque no MongoDB
    const db = await connectToDatabase();
    const productsCollection = db.collection('products');
    
    let productObjectId: ObjectId;
    try {
      productObjectId = new ObjectId(productId);
    } catch {
      return NextResponse.json(
        { error: 'ID do produto inválido' },
        { status: 400 }
      );
    }

    const product = await productsCollection.findOne({ _id: productObjectId });

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    const stock = typeof product.stock === 'number' ? product.stock : 0;
    if (stock < quantity) {
      return NextResponse.json(
        { error: 'Estoque insuficiente' },
        { status: 400 }
      );
    }

    // Buscar ou criar carrinho
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // Verificar se produto já está no carrinho
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem) {
      // Atualizar quantidade
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > stock) {
        return NextResponse.json(
          { error: 'Estoque insuficiente' },
          { status: 400 }
        );
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Adicionar novo item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    // Buscar carrinho atualizado
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!updatedCart) {
      return NextResponse.json(
        { error: 'Erro ao buscar carrinho atualizado' },
        { status: 500 }
      );
    }

    // Enriquecer itens com produtos do MongoDB
    const itemsWithProducts = await enrichCartItems(updatedCart.items);

    return NextResponse.json({
      ...updatedCart,
      items: itemsWithProducts,
    });
  } catch (error: any) {
    console.error('Erro ao adicionar ao carrinho:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar ao carrinho' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    await prisma.cartItem.deleteMany({
      where: { cart: { userId } },
    });

    return NextResponse.json({ message: 'Carrinho limpo com sucesso' });
  } catch (error: any) {
    console.error('Erro ao limpar carrinho:', error);
    return NextResponse.json(
      { error: 'Erro ao limpar carrinho' },
      { status: 500 }
    );
  }
}
