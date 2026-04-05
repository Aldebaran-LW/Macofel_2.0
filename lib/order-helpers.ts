// Funções auxiliares para trabalhar com pedidos e produtos do MongoDB
import { connectToDatabase, isInactiveProductStatus } from './mongodb-native';
import { ObjectId } from 'mongodb';

// Enriquecer itens de pedido com produtos do MongoDB
export async function enrichOrderItems(orderItems: any[]) {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');

  const itemsWithProducts = await Promise.all(
    orderItems.map(async (item) => {
      let productId: ObjectId;
      try {
        productId = new ObjectId(item.productId);
      } catch {
        return { ...item, product: null };
      }

      const product = await productsCollection.findOne({ _id: productId });
      
      if (!product || isInactiveProductStatus(product.status)) {
        return { ...item, product: null };
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
        },
      };
    })
  );

  return itemsWithProducts;
}

// Atualizar estoque de produtos no MongoDB
export async function updateProductStock(productId: string, quantityChange: number) {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  
  let productObjectId: ObjectId;
  try {
    productObjectId = new ObjectId(productId);
  } catch {
    throw new Error('ID do produto inválido');
  }

  const result = await productsCollection.updateOne(
    { _id: productObjectId },
    { $inc: { stock: -quantityChange } }
  );

  if (result.matchedCount === 0) {
    throw new Error('Produto não encontrado');
  }

  return result;
}

// Buscar produtos do MongoDB para verificar estoque e calcular total
export async function getCartProductsForOrder(cartItems: any[]): Promise<Array<{
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  featured: boolean;
  categoryId: any;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');

  const products = await Promise.all(
    cartItems.map(async (item) => {
      let productId: ObjectId;
      try {
        productId = new ObjectId(item.productId);
      } catch {
        return null;
      }

      const product = await productsCollection.findOne({ _id: productId });
      if (!product || isInactiveProductStatus(product.status)) {
        return null;
      }

      return {
        _id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        featured: product.featured ?? false,
        categoryId: product.categoryId,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    })
  );

  return products.filter((p): p is NonNullable<typeof p> => p !== null);
}
