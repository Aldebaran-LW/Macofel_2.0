'use client';

import { useState, useEffect } from 'react';
import { FolderTree } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count: { products: number };
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data ?? []);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Categorias</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories?.map?.((category) => (
          <div key={category?.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <FolderTree className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="font-semibold text-lg">{category?.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{category?.description}</p>
                <p className="text-sm text-gray-500">
                  {category?._count?.products} produto(s)
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
