import prisma from '@/lib/db';
import {
  getQuoteRequestById,
  setQuoteRequestLinkedOrderId,
} from '@/lib/mongodb-native';
import { computeQuoteProposalTotals } from '@/lib/quote-proposal-totals';

type CreateResult = { ok: boolean; orderId?: string; skipped?: boolean; error?: string };

/**
 * Cria um registo em `orders` (PostgreSQL) quando o cliente aceita a proposta,
 * para o pedido aparecer em **Admin → Pedidos**.
 */
export async function createOrderFromAcceptedQuote(
  quoteRequestId: string
): Promise<CreateResult> {
  try {
    const doc = await getQuoteRequestById(quoteRequestId);
    if (!doc) return { ok: false, error: 'Solicitação não encontrada' };
    if (doc.clientDecision !== 'accepted') {
      return { ok: false, skipped: true, error: 'Cliente não aceitou' };
    }
    if (!doc.proposal || !doc.proposalSentAt) {
      return { ok: false, error: 'Sem proposta enviada' };
    }
    if (doc.linkedOrderId) {
      return { ok: true, skipped: true, orderId: doc.linkedOrderId };
    }
    if (!doc.items?.length) {
      return { ok: false, error: 'Solicitação sem itens' };
    }

    const totals = computeQuoteProposalTotals(doc.items, doc.proposal);
    const total = Math.round(totals.totalPix * 100) / 100;

    const user = await prisma.user.findUnique({
      where: { id: doc.userId },
      select: { phone: true, firstName: true, lastName: true },
    });

    const customerPhone = user?.phone?.trim() || '(não informado no cadastro)';
    let customerName = doc.userName?.trim() || '';
    if (!customerName && user) {
      customerName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    }
    if (!customerName) customerName = doc.userEmail;

    const addrParts = [
      doc.shippingCityState,
      doc.shippingCep ? `CEP ${doc.shippingCep}` : null,
    ].filter(Boolean);
    const deliveryAddress = addrParts.length
      ? addrParts.join(' · ')
      : 'Endereço a combinar (orçamento aprovado)';

    const notes = [
      '[Orçamento aprovado]',
      `Solicitação ${doc.id}.`,
      `Subtotal produtos R$ ${totals.subtotal.toFixed(2)}; frete R$ ${totals.freight.toFixed(2)};`,
      totals.discountPix > 0
        ? `Desconto PIX/à vista sobre produtos: R$ ${totals.discountPix.toFixed(2)}.`
        : null,
      `Total acordado (referência PIX/à vista): R$ ${total.toFixed(2)}.`,
      doc.proposal.installmentMax
        ? `Parcelas: até ${doc.proposal.installmentMax}x; juros ${doc.proposal.installmentInterestMonthlyPercent}% a.m. (sobre parcelamento).`
        : null,
    ]
      .filter(Boolean)
      .join(' ');

    const order = await prisma.order.create({
      data: {
        userId: doc.userId,
        total,
        status: 'PENDING',
        customerName,
        customerEmail: doc.userEmail,
        customerPhone,
        deliveryAddress,
        notes,
        items: {
          create: doc.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: Number(it.price) || 0,
          })),
        },
      },
    });

    await setQuoteRequestLinkedOrderId(doc.id, order.id);
    return { ok: true, orderId: order.id };
  } catch (e: any) {
    console.error('[create-order-from-accepted-quote]', e);
    return { ok: false, error: e?.message ?? 'Erro ao criar pedido' };
  }
}
