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
  sort?: 'price_asc' | 'price_desc' | 'name' | 'relevance';
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

  // Ordenação
  const sortOption = filters?.sort || 'relevance';
  const sortSpec: [string, 1 | -1][] =
    sortOption === 'price_asc' ? [['price', 1]] :
    sortOption === 'price_desc' ? [['price', -1]] :
    sortOption === 'name' ? [['name', 1]] :
    [['createdAt', -1]];

  // Buscar produtos
  const products = await productsCollection
    .find(query)
    .sort(sortSpec)
    .skip(skip)
    .limit(limit)
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

  // Atualizar automaticamente imagens antigas que não têm os novos campos
  const updatePromises = images
    .filter((image: any) => 
      image.displayType === undefined || 
      image.animationOrder === undefined ||
      image.linkType === undefined ||
      image.productId === undefined ||
      image.categorySlug === undefined ||
      image.linkUrl === undefined
    )
    .map(async (image: any) => {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (image.displayType === undefined) updateData.displayType = 'grid';
      if (image.animationOrder === undefined || image.animationOrder === null) updateData.animationOrder = 0;
      if (image.linkType === undefined) updateData.linkType = null;
      if (image.productId === undefined) updateData.productId = null;
      if (image.categorySlug === undefined) updateData.categorySlug = null;
      if (image.linkUrl === undefined) updateData.linkUrl = null;

      await heroImagesCollection.updateOne(
        { _id: image._id },
        { $set: updateData }
      );
    });

  // Executar atualizações em paralelo (não bloquear a resposta)
  if (updatePromises.length > 0) {
    Promise.all(updatePromises).catch((error) => {
      console.error('Erro ao atualizar imagens antigas:', error);
    });
  }

  return images.map((image: any) => ({
    id: image._id.toString(),
    imageUrl: image.imageUrl,
    alt: image.alt,
    order: image.order,
    active: image.active,
    linkType: image.linkType || null,
    productId: image.productId || null,
    categorySlug: image.categorySlug || null,
    linkUrl: image.linkUrl || null,
    displayType: image.displayType || 'grid', // 'grid' ou 'large'
    animationOrder: image.animationOrder ?? 0, // Ordem na animação
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

  // Atualizar automaticamente imagens antigas que não têm os novos campos
  const updatePromises = images
    .filter((image: any) => 
      image.displayType === undefined || 
      image.animationOrder === undefined ||
      image.linkType === undefined ||
      image.productId === undefined ||
      image.categorySlug === undefined ||
      image.linkUrl === undefined
    )
    .map(async (image: any) => {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (image.displayType === undefined) updateData.displayType = 'grid';
      if (image.animationOrder === undefined || image.animationOrder === null) updateData.animationOrder = 0;
      if (image.linkType === undefined) updateData.linkType = null;
      if (image.productId === undefined) updateData.productId = null;
      if (image.categorySlug === undefined) updateData.categorySlug = null;
      if (image.linkUrl === undefined) updateData.linkUrl = null;

      await heroImagesCollection.updateOne(
        { _id: image._id },
        { $set: updateData }
      );
    });

  // Executar atualizações em paralelo (não bloquear a resposta)
  if (updatePromises.length > 0) {
    Promise.all(updatePromises).catch((error) => {
      console.error('Erro ao atualizar imagens antigas:', error);
    });
  }

  return images.map((image: any) => ({
    id: image._id.toString(),
    imageUrl: image.imageUrl,
    alt: image.alt,
    order: image.order,
    active: image.active,
    linkType: image.linkType || null,
    productId: image.productId || null,
    categorySlug: image.categorySlug || null,
    linkUrl: image.linkUrl || null,
    displayType: image.displayType || 'grid',
    animationOrder: image.animationOrder ?? 0,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }));
}

export async function createHeroImage(data: {
  imageUrl: string;
  alt?: string;
  order?: number;
  active?: boolean;
  linkType?: 'product' | 'category' | 'url' | null;
  productId?: string | null;
  categorySlug?: string | null;
  linkUrl?: string | null;
  displayType?: 'grid' | 'large';
  animationOrder?: number;
}) {
  const db = await connectToDatabase();
  const heroImagesCollection = db.collection('hero_images');

  const result = await heroImagesCollection.insertOne({
    imageUrl: data.imageUrl,
    alt: data.alt || 'Imagem do Hero',
    order: data.order ?? 0,
    active: data.active ?? true,
    linkType: data.linkType || null,
    productId: data.productId || null,
    categorySlug: data.categorySlug || null,
    linkUrl: data.linkUrl || null,
    displayType: data.displayType || 'grid',
    animationOrder: data.animationOrder ?? 0,
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
  linkType?: 'product' | 'category' | 'url' | null;
  productId?: string | null;
  categorySlug?: string | null;
  linkUrl?: string | null;
  displayType?: 'grid' | 'large';
  animationOrder?: number;
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
  if (data.linkType !== undefined) updateData.linkType = data.linkType;
  if (data.productId !== undefined) updateData.productId = data.productId;
  if (data.categorySlug !== undefined) updateData.categorySlug = data.categorySlug;
  if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl;
  if (data.displayType !== undefined) updateData.displayType = data.displayType;
  if (data.animationOrder !== undefined) updateData.animationOrder = data.animationOrder;

  const result = await heroImagesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return result.modifiedCount > 0;
}

// ----------------------------
// HERO SLIDES (HeroCarousel)
// ----------------------------

export type HeroSlideDoc = {
  imageUrl: string;
  subtitle?: string | null;
  title?: string | null;
  text?: string | null;
  href?: string | null;
  order?: number;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

function normalizeHeroSlide(doc: any) {
  return {
    id: doc._id?.toString?.() ?? String(doc.id),
    imageUrl: String(doc.imageUrl || ''),
    subtitle: doc.subtitle ?? null,
    title: doc.title ?? null,
    text: doc.text ?? null,
    href: doc.href ?? null,
    order: typeof doc.order === 'number' ? doc.order : 0,
    active: typeof doc.active === 'boolean' ? doc.active : true,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getHeroSlides() {
  const db = await connectToDatabase();
  const heroSlidesCollection = db.collection('hero_slides');

  const slides = await heroSlidesCollection
    .find({ active: true })
    .sort({ order: 1, updatedAt: -1 })
    .toArray();

  return slides.map(normalizeHeroSlide);
}

export async function getAllHeroSlides() {
  const db = await connectToDatabase();
  const heroSlidesCollection = db.collection('hero_slides');

  const slides = await heroSlidesCollection
    .find({})
    .sort({ order: 1, updatedAt: -1 })
    .toArray();

  return slides.map(normalizeHeroSlide);
}

export async function createHeroSlide(data: HeroSlideDoc) {
  const db = await connectToDatabase();
  const heroSlidesCollection = db.collection('hero_slides');

  const now = new Date();
  const result = await heroSlidesCollection.insertOne({
    imageUrl: data.imageUrl,
    subtitle: data.subtitle ?? null,
    title: data.title ?? null,
    text: data.text ?? null,
    href: data.href ?? null,
    order: data.order ?? 0,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

export async function updateHeroSlide(id: string, data: Partial<HeroSlideDoc>) {
  const db = await connectToDatabase();
  const heroSlidesCollection = db.collection('hero_slides');

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.subtitle !== undefined) updateData.subtitle = data.subtitle ?? null;
  if (data.title !== undefined) updateData.title = data.title ?? null;
  if (data.text !== undefined) updateData.text = data.text ?? null;
  if (data.href !== undefined) updateData.href = data.href ?? null;
  if (data.order !== undefined) updateData.order = data.order ?? 0;
  if (data.active !== undefined) updateData.active = data.active ?? true;

  const result = await heroSlidesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return result.modifiedCount > 0;
}

export async function deleteHeroSlide(id: string) {
  const db = await connectToDatabase();
  const heroSlidesCollection = db.collection('hero_slides');

  const result = await heroSlidesCollection.deleteOne({
    _id: new ObjectId(id),
  });

  return result.deletedCount > 0;
}
