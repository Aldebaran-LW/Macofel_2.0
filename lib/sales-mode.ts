/**
 * Compra direta (checkout / pagamento online).
 * Por omissão falso: o site opera em modo **solicitação de orçamento**.
 * Para activar compras directas mais tarde: `NEXT_PUBLIC_DIRECT_CHECKOUT=true` no `.env`.
 */
export const DIRECT_CHECKOUT_ENABLED =
  process.env.NEXT_PUBLIC_DIRECT_CHECKOUT === 'true';
