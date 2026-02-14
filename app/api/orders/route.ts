import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

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
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
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

    // Buscar carrinho
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || (cart?.items?.length ?? 0) === 0) {
      return NextResponse.json(
        { error: 'Carrinho vazio' },
        { status: 400 }
      );
    }

    // Calcular total e verificar estoque
    let total = 0;
    for (const item of cart?.items ?? []) {
      if ((item?.product?.stock ?? 0) < (item?.quantity ?? 0)) {
        return NextResponse.json(
          { error: `Estoque insuficiente para ${item?.product?.name}` },
          { status: 400 }
        );
      }
      total += (item?.product?.price ?? 0) * (item?.quantity ?? 0);
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
          create: (cart?.items ?? []).map((item: any) => ({
            productId: item?.productId ?? '',
            quantity: item?.quantity ?? 0,
            price: item?.product?.price ?? 0,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // Atualizar estoque
    for (const item of cart?.items ?? []) {
      await prisma.product.update({
        where: { id: item?.productId ?? '' },
        data: {
          stock: {
            decrement: item?.quantity ?? 0,
          },
        },
      });
    }

    // Limpar carrinho
    await prisma.cartItem.deleteMany({
      where: { cartId: cart?.id ?? '' },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pedido' },
      { status: 500 }
    );
  }
}
