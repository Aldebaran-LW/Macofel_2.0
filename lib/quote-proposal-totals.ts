/** Tipos e cálculo puro — seguro para importar no cliente (sem Mongo). */

export type QuoteProposalStored = {
  freightValue: number;
  pixDiscountType: 'none' | 'fixed' | 'percent';
  pixDiscountValue: number;
  installmentMax: number;
  installmentInterestMonthlyPercent: number;
  installmentNotes: string | null;
  messageToClient: string | null;
};

export type QuoteItemForTotals = { price?: number; quantity?: number };

/** Desconto PIX sobre subtotal dos produtos; frete somado ao final. */
export function computeQuoteProposalTotals(
  items: QuoteItemForTotals[],
  proposal: QuoteProposalStored | null
) {
  const subtotal = items.reduce(
    (s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0),
    0
  );
  if (!proposal) {
    return { subtotal, discountPix: 0, subtotalAfterPix: subtotal, freight: 0, totalPix: subtotal };
  }
  const freight = Number(proposal.freightValue) || 0;
  let subtotalAfterPix = subtotal;
  let discountPix = 0;
  if (proposal.pixDiscountType === 'percent' && proposal.pixDiscountValue > 0) {
    const p = Math.min(100, Math.max(0, proposal.pixDiscountValue));
    discountPix = subtotal * (p / 100);
    subtotalAfterPix = subtotal - discountPix;
  } else if (proposal.pixDiscountType === 'fixed' && proposal.pixDiscountValue > 0) {
    discountPix = Math.min(subtotal, proposal.pixDiscountValue);
    subtotalAfterPix = subtotal - discountPix;
  }
  const totalPix = subtotalAfterPix + freight;
  return { subtotal, discountPix, subtotalAfterPix, freight, totalPix };
}
