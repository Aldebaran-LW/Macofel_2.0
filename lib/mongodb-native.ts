// Cliente MongoDB Nativo (sem Prisma) - Apenas para exibir produtos
import { MongoClient, Db, ObjectId } from 'mongodb';

// Função para garantir que a connection string tenha nome do banco
function ensureDatabaseName(uri: string): string {
  if (!uri) return uri;
  
  // Se a URI não tem nome do banco (termina com /? ou apenas ?), adiciona /test
  if (uri.includes('/?') || uri.match(/mongodb\+srv:\/\/[^/]+\?/)) {
    // Adiciona /test antes do ?
    return uri.replace(/\?/, '/test?');
  }
  // Se já tem nome do banco, retorna como está
  return uri;
}

const uri = ensureDatabaseName(process.env.MONGODB_URI || '');
const dbName = 'test'; // Banco onde populamos os produtos

let client: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  if (!uri) {
    throw new Error('MONGODB_URI não está definida');
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }

  cachedDb = client.db(dbName);
  return cachedDb;
}

export async function getProducts(filters?: {
  search?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  page?: number;
  limit?: number;
}) {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  const categoriesCollection = db.collection('categories');

  const query: any = {};

  // Filtro de busca
  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }

  // Filtro de categoria
  if (filters?.categorySlug) {
    const category = await categoriesCollection.findOne({ slug: filters.categorySlug });
    if (category) {
      query.categoryId = category._id;
    }
  }

  // Filtro de preço
  if (filters?.minPrice || filters?.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }

  // Filtro de destaque
  if (filters?.featured) {
    query.featured = true;
  }

  // Paginação
  const page = filters?.page || 1;
  const limit = filters?.limit || 12;
  const skip = (page - 1) * limit;

  // Buscar produtos
  const products = await productsCollection
    .find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .toArray();

  // Buscar categorias para cada produto
  const productsWithCategories = await Promise.all(
    products.map(async (product: any) => {
      // Converter categoryId para ObjectId se necessário
      const categoryId = product.categoryId instanceof ObjectId 
        ? product.categoryId 
        : new ObjectId(product.categoryId);
      
      const category = await categoriesCollection.findOne({
        _id: categoryId,
      });
      return {
        id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        featured: product.featured,
        categoryId: product.categoryId,
        category: category
          ? {
              id: category._id.toString(),
              name: category.name,
              slug: category.slug,
            }
          : null,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    })
  );

  // Contar total
  const total = await productsCollection.countDocuments(query);

  return {
    products: productsWithCategories,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProductBySlug(slug: string) {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  const categoriesCollection = db.collection('categories');

  const product = await productsCollection.findOne({ slug });

  if (!product) {
    return null;
  }

  const categoryId = typeof product.categoryId === 'string' 
    ? new ObjectId(product.categoryId) 
    : product.categoryId;
  
  const category = await categoriesCollection.findOne({
    _id: categoryId,
  });

  return {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl,
    featured: product.featured,
    categoryId: product.categoryId,
    category: category
      ? {
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
        }
      : null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function getCategories() {
  const db = await connectToDatabase();
  const categoriesCollection = db.collection('categories');

  const categories = await categoriesCollection.find({}).sort({ name: 1 }).toArray();

  // Contar produtos por categoria
  const productsCollection = db.collection('products');
  const categoriesWithCount = await Promise.all(
    categories.map(async (category: any) => {
      const count = await productsCollection.countDocuments({
        categoryId: category._id,
      });
      return {
        id: category._id.toString(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        _count: {
          products: count,
        },
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
    })
  );

  return categoriesWithCount;
}

export async function getHeroImages() {
  const db = await connectToDatabase();
  const heroImagesCollection = db.collection('hero_images');

  const images = await heroImagesCollection
    .find({ active: true })
    .sort({ order: 1 })
    .toArray();

  return images.map((image: any) => ({
    id: image._id.toString(),
    imageUrl: image.imageUrl,
    alt: image.alt,
    order: image.order,
    active: image.active,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }));
}

export async function getAllHeroImages() {
  const db = await connectToDatabase();
  const heroImagesCollection = db.collection('hero_images');

  const images = await heroImagesCollection
    .find({})
    .sort({ order: 1 })
    .toArray();

  return images.map((image: any) => ({
    id: image._id.toString(),
    imageUrl: image.imageUrl,
    alt: image.alt,
    order: image.order,
    active: image.active,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }));
}

export async function createHeroImage(data: {
  imageUrl: string;
  alt?: string;
  order?: number;
  active?: boolean;
}) {
  const db = await connectToDatabase();
  const heroImagesCollection = db.collection('hero_images');

  const result = await heroImagesCollection.insertOne({
    imageUrl: data.imageUrl,
    alt: data.alt || 'Imagem do Hero',
    order: data.order ?? 0,
    active: data.active ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return result.insertedId.toString();
}

export async function deleteHeroImage(id: string) {
  const db = await connectToDatabase();
  const heroImagesCollection = db.collection('hero_images');

  const result = await heroImagesCollection.deleteOne({
    _id: new ObjectId(id),
  });

  return result.deletedCount > 0;
}

export async function updateHeroImage(id: string, data: {
  imageUrl?: string;
  alt?: string;
  order?: number;
  active?: boolean;
}) {
  const db = await connectToDatabase();
  const heroImagesCollection = db.collection('hero_images');

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.alt !== undefined) updateData.alt = data.alt;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.active !== undefined) updateData.active = data.active;

  const result = await heroImagesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return result.modifiedCount > 0;
}
