'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

interface Favorite {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    slug: string;
  };
}

export default function FavoritosPage() {
  const { data: session, status } = useSession() ?? {};
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFavorites();
    }
  }, [status]);

  const fetchFavorites = async () => {
    try {
      // Por enquanto, vamos simular dados
      // Você pode criar uma API para gerenciar favoritos depois
      setFavorites([]);
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    try {
      // Implementar lógica de remover favorito
      setFavorites(favorites.filter(fav => fav.id !== id));
      toast.success('Produto removido dos favoritos');
    } catch (error) {
      toast.error('Erro ao remover favorito');
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      if (res.ok) {
        toast.success('Produto adicionado ao carrinho!');
      } else {
        toast.error('Erro ao adicionar ao carrinho');
      }
    } catch (error) {
      toast.error('Erro ao adicionar ao carrinho');
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meus Favoritos</h1>
        <p className="text-gray-600 mt-2">
          Produtos que você salvou para comprar depois
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <Heart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Nenhum favorito ainda
          </h2>
          <p className="text-gray-600 mb-6">
            Adicione produtos aos favoritos para encontrá-los facilmente depois
          </p>
          <Link
            href="/catalogo"
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Ver Catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
            >
              <Link href={`/produto/${favorite.product.slug}`}>
                <div className="relative h-48 bg-gray-100">
                  {favorite.product.imageUrl ? (
                    <Image
                      src={favorite.product.imageUrl}
                      alt={favorite.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      Sem imagem
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/produto/${favorite.product.slug}`}>
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {favorite.product.name}
                  </h3>
                </Link>
                <p className="text-xl font-bold text-red-600 mb-4">
                  R$ {favorite.product.price.toFixed(2)}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddToCart(favorite.product.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    size="sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Carrinho
                  </Button>
                  <Button
                    onClick={() => handleRemoveFavorite(favorite.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
