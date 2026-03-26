export type BuscarProdutoResponse = {
  title: string;
  photos: string[];
  weight_grams: number | null;
  dimensions_cm: string | null;
  price_reference: number | null;
  source: string;
  ml_url?: string | null;
};
