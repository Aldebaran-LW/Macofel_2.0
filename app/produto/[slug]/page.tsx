'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Minus, Plus, Package, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: {
    name: string;
    slug: string;
  };
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession() ?? {};
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (params?.slug) {
      fetchProduct();
    }
  }, [params?.slug]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params?.slug}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      } else {
        toast.error('Produto não encontrado');
        router.push('/catalogo');
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      toast.error('Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!session?.user) {
      toast.error('Faça login para adicionar ao carrinho');
      router.push('/login');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?.id,
          quantity,
        }),
      });

      if (res.ok) {
        toast.success('Produto adicionado ao carrinho!');
        router.push('/carrinho');
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao adicionar ao carrinho');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao adicionar ao carrinho');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto max-w-7xl px-4 py-12">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-24 bg-gray-200 rounded" />
                <div className="h-12 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const isOutOfStock = (product?.stock ?? 0) === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-red-600">Início</Link>
          <span className="mx-2">/</span>
          <Link href="/catalogo" className="hover:text-red-600">Catálogo</Link>
          <span className="mx-2">/</span>
          <Link
            href={`/catalogo?category=${product?.category?.slug}`}
            className="hover:text-red-600"
          >
            {product?.category?.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product?.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative aspect-square bg-gray-100">
              {product?.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product?.name ?? 'Produto'}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-24 w-24 text-gray-300" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">
                  {product?.category?.name}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{product?.name}</h1>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-red-600">
                R$ {product?.price?.toFixed?.(2)}
              </span>
            </div>

            <div className="border-t border-b py-4">
              <p className="text-gray-700 leading-relaxed">{product?.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-600">
                {isOutOfStock ? (
                  <span className="text-red-600 font-medium">Produto indisponível</span>
                ) : (
                  <span className="text-green-600 font-medium">
                    {product?.stock} unidades em estoque
                  </span>
                )}
              </span>
            </div>

            {!isOutOfStock && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quantidade</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setQuantity(Math.min(Math.max(1, val), product?.stock ?? 1));
                      }}
                      className="w-20 text-center"
                      min={1}
                      max={product?.stock}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.min((product?.stock ?? 1), quantity + 1))}
                      disabled={quantity >= (product?.stock ?? 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleAddToCart}
                  disabled={adding}
                >
                  {adding ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Adicionando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Adicionar ao Carrinho
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
