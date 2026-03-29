// Cliente MongoDB Nativo (sem Prisma) - Apenas para exibir produtos
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { QuoteProposalStored } from './quote-proposal-totals';

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
    // Falhar mais rápido para evitar travar endpoints da UI
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
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

  // Catálogo público: esconder INATIVO. Em Mongo, doc sem campo `status` ainda entra ($ne false).
  query.status = { $ne: false };

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
        minStock: product.minStock ?? null,
        weight: product.weight ?? null,
        dimensionsCm: product.dimensionsCm ?? null,
        imageUrl: product.imageUrl,
        imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
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

  // Ficha do produto: tratar como inexistente se importação marcou INATIVO.
  if (product.status === false) {
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
    minStock: product.minStock ?? null,
    weight: product.weight ?? null,
    dimensionsCm: product.dimensionsCm ?? null,
    imageUrl: product.imageUrl,
    imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
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

  // Importante: evitar N queries (countDocuments por categoria) para reduzir timeouts.
  // A UI usa `_count?.products || 0`, então podemos enviar 0 quando não calculado.
  return categories.map((category: any) => ({
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    _count: {
      products: 0,
    },
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }));
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

// ----------------------------
// ORCAMENTOS (MongoDB nativo)
// ----------------------------

export type OrcamentoItemDoc = {
  produto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
};

export type OrcamentoDoc = {
  clienteNome: string;
  clienteEmail?: string | null;
  clienteTelefone?: string | null;
  observacoes?: string | null;

  itens: OrcamentoItemDoc[];

  // Valores calculados no momento do salvamento
  subtotal: number;
  freteValor: number;
  descontoTipo: 'reais' | 'percentual';
  descontoRaw: number; // R$ (se descontoTipo=reais) ou % (se percentual)
  descontoValor: number; // valor em R$ do desconto (após conversão/clamp)
  total: number;
};

function normalizeOrcamento(doc: any) {
  return {
    id: doc._id.toString(),
    clienteNome: String(doc.clienteNome ?? ''),
    clienteEmail: doc.clienteEmail ?? null,
    clienteTelefone: doc.clienteTelefone ?? null,
    observacoes: doc.observacoes ?? null,
    itens: Array.isArray(doc.itens) ? doc.itens : [],
    subtotal: typeof doc.subtotal === 'number' ? doc.subtotal : 0,
    freteValor: typeof doc.freteValor === 'number' ? doc.freteValor : 0,
    descontoTipo: doc.descontoTipo === 'percentual' ? 'percentual' : 'reais',
    descontoRaw: typeof doc.descontoRaw === 'number' ? doc.descontoRaw : 0,
    descontoValor: typeof doc.descontoValor === 'number' ? doc.descontoValor : 0,
    total: typeof doc.total === 'number' ? doc.total : 0,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}

export async function createOrcamento(data: OrcamentoDoc) {
  const db = await connectToDatabase();
  const orcamentosCollection = db.collection('orcamentos');

  const now = new Date();
  const result = await orcamentosCollection.insertOne({
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

export async function getOrcamentos(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const db = await connectToDatabase();
  const orcamentosCollection = db.collection('orcamentos');

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const query: any = {};
  if (filters?.search?.trim()) {
    query.clienteNome = { $regex: filters.search.trim(), $options: 'i' };
  }

  const total = await orcamentosCollection.countDocuments(query);
  const docs = await orcamentosCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return {
    orcamentos: docs.map(normalizeOrcamento),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getOrcamentoById(id: string) {
  const db = await connectToDatabase();
  const orcamentosCollection = db.collection('orcamentos');

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }

  const doc = await orcamentosCollection.findOne({ _id: oid });
  if (!doc) return null;

  return normalizeOrcamento(doc);
}

export async function updateOrcamento(id: string, data: OrcamentoDoc): Promise<boolean> {
  const db = await connectToDatabase();
  const orcamentosCollection = db.collection('orcamentos');

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return false;
  }

  const result = await orcamentosCollection.updateOne(
    { _id: oid },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

export async function deleteOrcamento(id: string): Promise<boolean> {
  const db = await connectToDatabase();
  const orcamentosCollection = db.collection('orcamentos');

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return false;
  }

  const result = await orcamentosCollection.deleteOne({ _id: oid });
  return result.deletedCount > 0;
}

// ----------------------------
// SOLICITAÇÕES DE ORÇAMENTO (cliente → admin)
// ----------------------------

export type QuoteRequestItem = {
  productId: string;
  name: string;
  slug?: string;
  quantity: number;
  price?: number;
};

export type QuoteRequestStatus = 'pending' | 'viewed' | 'answered' | 'archived';

/** Resposta do cliente à proposta enviada pelo admin */
export type QuoteClientDecision = 'pending' | 'accepted' | 'rejected';

export type { QuoteProposalStored } from './quote-proposal-totals';

export type QuoteRequestInsert = {
  userId: string;
  userEmail: string;
  userName: string;
  message?: string | null;
  items: QuoteRequestItem[];
  status: QuoteRequestStatus;
  /** CEP só dígitos (até 8), para cálculo de frete */
  shippingCep?: string | null;
  /** Cidade / UF ou referência de entrega */
  shippingCityState?: string | null;
  /** Cliente pede valor de frete envio no orçamento */
  requestShippingQuote?: boolean;
  /** Cliente pede condições de desconto (ex.: PIX, à vista) */
  requestPixDiscount?: boolean;
};

function normalizeQuoteRequest(doc: any) {
  return {
    id: doc._id.toString(),
    userId: String(doc.userId ?? ''),
    userEmail: String(doc.userEmail ?? ''),
    userName: String(doc.userName ?? ''),
    message: doc.message ?? null,
    items: Array.isArray(doc.items) ? doc.items : [],
    status: (doc.status as QuoteRequestStatus) || 'pending',
    shippingCep: doc.shippingCep != null ? String(doc.shippingCep) : null,
    shippingCityState: doc.shippingCityState != null ? String(doc.shippingCityState) : null,
    requestShippingQuote: doc.requestShippingQuote === true,
    requestPixDiscount: doc.requestPixDiscount === true,
    proposal: normalizeQuoteProposalDoc(doc.proposal),
    proposalSentAt: doc.proposalSentAt ?? null,
    clientDecision: normalizeClientDecision(doc.clientDecision, doc.proposalSentAt),
    clientDecidedAt: doc.clientDecidedAt ?? null,
    linkedOrderId: doc.linkedOrderId != null ? String(doc.linkedOrderId) : null,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}

function normalizeQuoteProposalDoc(raw: any): QuoteProposalStored | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    freightValue: Number(raw.freightValue) || 0,
    pixDiscountType:
      raw.pixDiscountType === 'fixed' || raw.pixDiscountType === 'percent'
        ? raw.pixDiscountType
        : 'none',
    pixDiscountValue: Number(raw.pixDiscountValue) || 0,
    installmentMax: Math.max(1, Math.min(48, parseInt(String(raw.installmentMax ?? 1), 10) || 1)),
    installmentInterestMonthlyPercent: Math.max(0, Number(raw.installmentInterestMonthlyPercent) || 0),
    installmentNotes: raw.installmentNotes != null ? String(raw.installmentNotes).slice(0, 2000) : null,
    messageToClient: raw.messageToClient != null ? String(raw.messageToClient).slice(0, 4000) : null,
  };
}

function normalizeClientDecision(raw: any, proposalSentAt: any): QuoteClientDecision | null {
  /** Decisão final gravada no Mongo tem prioridade (evita anular "accepted" se proposalSentAt vier ausente na leitura). */
  if (raw === 'accepted' || raw === 'rejected') return raw;
  if (!proposalSentAt) return null;
  return 'pending';
}

/** Totais para exibição (desconto PIX sobre subtotal dos produtos; frete somado ao final). */
/** Cliente não deve ver rascunho da proposta antes do envio. */
export function sanitizeQuoteRequestForClient(doc: any) {
  if (doc?.proposalSentAt) return doc;
  return {
    ...doc,
    proposal: null,
    clientDecision: null,
    clientDecidedAt: null,
  };
}

export { computeQuoteProposalTotals } from './quote-proposal-totals';

export async function createQuoteRequest(data: QuoteRequestInsert): Promise<string> {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  const now = new Date();
  const result = await col.insertOne({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId.toString();
}

export async function listQuoteRequestsByUser(userId: string) {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  const docs = await col.find({ userId }).sort({ createdAt: -1 }).limit(100).toArray();
  return docs.map(normalizeQuoteRequest);
}

export async function listQuoteRequestsAdmin(filters?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 30, 100);
  const skip = (page - 1) * limit;

  const query: any = {};
  if (filters?.status && filters.status !== 'all') {
    query.status = filters.status;
  }

  const total = await col.countDocuments(query);
  const docs = await col.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();

  return {
    solicitacoes: docs.map(normalizeQuoteRequest),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getQuoteRequestById(id: string) {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  const doc = await col.findOne({ _id: oid });
  if (!doc) return null;
  return normalizeQuoteRequest(doc);
}

export async function updateQuoteRequestStatus(
  id: string,
  status: QuoteRequestStatus
): Promise<boolean> {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return false;
  }
  const result = await col.updateOne(
    { _id: oid },
    { $set: { status, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

function parseProposalBody(body: any): QuoteProposalStored | null {
  if (body == null || typeof body !== 'object') return null;
  const freightValue = Math.max(0, Number(body.freightValue) || 0);
  const pixType = body.pixDiscountType;
  const pixDiscountType =
    pixType === 'fixed' || pixType === 'percent' ? pixType : 'none';
  let pixDiscountValue = Math.max(0, Number(body.pixDiscountValue) || 0);
  if (pixDiscountType === 'percent') {
    pixDiscountValue = Math.min(100, pixDiscountValue);
  }
  const installmentMax = Math.max(1, Math.min(48, parseInt(String(body.installmentMax ?? 1), 10) || 1));
  const installmentInterestMonthlyPercent = Math.max(
    0,
    Number(body.installmentInterestMonthlyPercent) || 0
  );
  const installmentNotes =
    body.installmentNotes != null ? String(body.installmentNotes).trim().slice(0, 2000) : null;
  const messageToClient =
    body.messageToClient != null ? String(body.messageToClient).trim().slice(0, 4000) : null;

  return {
    freightValue,
    pixDiscountType,
    pixDiscountValue,
    installmentMax,
    installmentInterestMonthlyPercent,
    installmentNotes: installmentNotes || null,
    messageToClient: messageToClient || null,
  };
}

/** Admin: grava valores da proposta sem enviar ao cliente. */
export async function saveQuoteRequestProposalDraft(id: string, proposal: any): Promise<boolean> {
  const p = parseProposalBody(proposal);
  if (!p) return false;
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return false;
  }
  const result = await col.updateOne(
    { _id: oid },
    { $set: { proposal: p, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

/** Admin: envia (ou reenvia) proposta ao cliente — aguarda aprovação. */
export async function sendQuoteRequestProposalToClient(id: string, proposal: any): Promise<boolean> {
  const p = parseProposalBody(proposal);
  if (!p) return false;
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return false;
  }
  const now = new Date();
  const result = await col.updateOne(
    { _id: oid },
    {
      $set: {
        proposal: p,
        proposalSentAt: now,
        clientDecision: 'pending',
        clientDecidedAt: null,
        status: 'answered',
        updatedAt: now,
      },
    }
  );
  return result.matchedCount > 0;
}

/** Cliente: aceita ou recusa proposta já enviada. */
export async function setQuoteRequestClientDecision(
  id: string,
  userId: string,
  decision: 'accepted' | 'rejected'
): Promise<{ ok: boolean; error?: string }> {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return { ok: false, error: 'ID inválido' };
  }

  const doc = await col.findOne({ _id: oid });
  if (!doc) return { ok: false, error: 'Não encontrado' };
  if (String(doc.userId) !== String(userId)) return { ok: false, error: 'Sem permissão' };
  if (!doc.proposalSentAt) return { ok: false, error: 'Nenhuma proposta enviada' };
  const decided = doc.clientDecision === 'accepted' || doc.clientDecision === 'rejected';
  if (decided) {
    return { ok: false, error: 'Resposta já registrada' };
  }

  const result = await col.updateOne(
    { _id: oid },
    {
      $set: {
        clientDecision: decision,
        clientDecidedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
  return { ok: result.modifiedCount > 0 };
}

/** Liga pedido Postgres criado após o cliente aceitar a proposta. */
export async function setQuoteRequestLinkedOrderId(
  quoteRequestId: string,
  orderId: string
): Promise<boolean> {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(quoteRequestId);
  } catch {
    return false;
  }
  const result = await col.updateOne(
    { _id: oid },
    { $set: { linkedOrderId: orderId, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}
