import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { enrichOrderItems, getCartProductsForOrder, updateProductStock } from '@/lib/order-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const where: any = userRole === 'ADMIN' ? {} : { userId };

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true, // Não incluir product aqui, vamos buscar do MongoDB
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enriquecer itens com produtos do MongoDB
    const ordersWithProducts = await Promise.all(
      orders.map(async (order) => ({
        ...order,
        items: await enrichOrderItems(order.items),
      }))
    );

    return NextResponse.json(ordersWithProducts);
  } catch (error: any) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { customerName, customerEmail, customerPhone, deliveryAddress, notes } = body;

    if (!customerName || !customerEmail || !customerPhone || !deliveryAddress) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Buscar carrinho (sem incluir product)
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!cart || (cart?.items?.length ?? 0) === 0) {
      return NextResponse.json(
        { error: 'Carrinho vazio' },
        { status: 400 }
      );
    }

    // Buscar produtos do MongoDB para verificar estoque e calcular total
    const products = await getCartProductsForOrder(cart.items);

    // Calcular total e verificar estoque
    let total = 0;
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const product = products[i];

      if (!product) {
        return NextResponse.json(
          { error: `Produto não encontrado: ${item.productId}` },
          { status: 404 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Estoque insuficiente para ${product.name}` },
          { status: 400 }
        );
      }

      total += product.price * item.quantity;
    }

    // Criar pedido e itens
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        customerName,
        customerEmail,
        customerPhone,
        deliveryAddress,
        notes: notes ?? null,
        status: 'PENDING',
        items: {
          create: cart.items.map((item: any, index: number) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: products[index]?.price ?? 0,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Atualizar estoque no MongoDB
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      try {
        await updateProductStock(item.productId, item.quantity);
      } catch (error: any) {
        console.error(`Erro ao atualizar estoque do produto ${item.productId}:`, error);
        // Continuar mesmo se houver erro em um produto
      }
    }

    // Limpar carrinho
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Enriquecer itens com produtos do MongoDB
    const orderWithProducts = {
      ...order,
      items: await enrichOrderItems(order.items),
    };

    return NextResponse.json(orderWithProducts, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pedido' },
      { status: 500 }
    );
  }
}
