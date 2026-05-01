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

/** Mesmo critério que o Prisma Mongo: nome do path da URI (…/nomeBase?…). Evita admin vazio com catálogo cheio. */
function databaseNameFromMongoUri(connectionUri: string): string {
  if (!connectionUri) return 'test';
  const withoutQuery = connectionUri.split('?')[0] ?? connectionUri;
  const i = withoutQuery.lastIndexOf('/');
  if (i < 0 || i >= withoutQuery.length - 1) return 'test';
  const name = withoutQuery.slice(i + 1).trim();
  return name || 'test';
}

const uri = ensureDatabaseName(process.env.MONGODB_URI || '');
const dbName = databaseNameFromMongoUri(uri);

let client: MongoClient | null = null;
let cachedDb: Db | null = null;

// Catálogo público: aceitar ativos legados e excluir inativos em formatos mistos.
const INACTIVE_STATUS_VALUES = [
  false,
  0,
  '0',
  'false',
  'inativo',
  'INATIVO',
  'inactive',
  'INACTIVE',
  /** Rascunhos / fila do agente de catálogo (não listar na vitrine). */
  'pending_review',
  /** Importação rápida aguardando enriquecimento IA em background. */
  'imported',
  'rejected',
];

export function isInactiveProductStatus(status: unknown): boolean {
  return (INACTIVE_STATUS_VALUES as readonly unknown[]).includes(status);
}

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

/**
 * Fecha o `MongoClient` singleton. Usar em scripts CLI/testes para o processo Node terminar.
 * Não chamar no meio de pedidos Next.js em produção (partilha o mesmo cliente).
 */
export async function disconnectMongoNativeClient(): Promise<void> {
  if (client) {
    await client.close().catch(() => {});
    client = null;
    cachedDb = null;
  }
}

export async function getProducts(filters?: {
  search?: string;
  categorySlug?: string;
  subcategorias?: string[];
  marcas?: string[];
  materiais?: string[];
  acabamentos?: string[];
  tipos?: string[];
  bitolas?: string[];
  voltagens?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'name_asc' | 'newest' | 'best_selling';
}) {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  const categoriesCollection = db.collection('categories');

  const query: any = {};

  // Filtro de busca
  if (filters?.search) {
    const safe = escapeMongoRegex(filters.search.trim());
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { slug: { $regex: safe, $options: 'i' } },
    ];
  }

  // Filtro de categoria (com descendentes recursivos)
  if (filters?.categorySlug) {
    const category = await categoriesCollection.findOne({ slug: filters.categorySlug });
    if (category) {
      const objectIds: ObjectId[] = [category._id];
      const stringIds = new Set<string>([category._id.toString()]);
      const queue: string[] = [category._id.toString()];
      while (queue.length > 0) {
        const parentId = queue.shift()!;
        const parentMatch: any[] = [{ parentId }];
        if (ObjectId.isValid(parentId)) {
          parentMatch.push({ parentId: new ObjectId(parentId) });
        }
        const children = await categoriesCollection
          .find({ $or: parentMatch }, { projection: { _id: 1 } })
          .toArray();
        for (const child of children) {
          const childId = child._id.toString();
          if (stringIds.has(childId)) continue;
          objectIds.push(child._id);
          stringIds.add(childId);
          queue.push(childId);
        }
      }
      query.categoryId = { $in: [...objectIds, ...Array.from(stringIds)] };
    }
  }

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const multiFieldFilter = (
    values: string[] | undefined,
    fields: string | string[]
  ): Record<string, any> | null => {
    if (!values || values.length === 0) return null;
    const cleaned = values.map((v) => v.trim()).filter(Boolean);
    if (cleaned.length === 0) return null;
    const clauses = cleaned.map((value) => {
      const regex = { $regex: `^${escapeRegex(value)}$`, $options: 'i' };
      if (Array.isArray(fields)) return { $or: fields.map((f) => ({ [f]: regex })) };
      return { [fields]: regex };
    });
    return { $or: clauses };
  };

  const andClauses: any[] = [];
  const marcasFilter = multiFieldFilter(filters?.marcas, 'marca');
  if (marcasFilter) andClauses.push(marcasFilter);
  const materiaisFilter = multiFieldFilter(filters?.materiais, ['material', 'materialTipo']);
  if (materiaisFilter) andClauses.push(materiaisFilter);
  const acabamentosFilter = multiFieldFilter(filters?.acabamentos, ['acabamento', 'corAcabamento']);
  if (acabamentosFilter) andClauses.push(acabamentosFilter);
  const tiposFilter = multiFieldFilter(filters?.tipos, ['tipo', 'toolType']);
  if (tiposFilter) andClauses.push(tiposFilter);
  const bitolasFilter = multiFieldFilter(filters?.bitolas, 'bitola');
  if (bitolasFilter) andClauses.push(bitolasFilter);
  const voltagensFilter = multiFieldFilter(filters?.voltagens, ['voltagem', 'tensao']);
  if (voltagensFilter) andClauses.push(voltagensFilter);
  const subcategoriasFilter = multiFieldFilter(filters?.subcategorias, 'subcategoria');
  if (subcategoriasFilter) andClauses.push(subcategoriasFilter);

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

  if (filters?.inStock) {
    query.stock = { $gt: 0 };
  }

  if (filters?.onSale) {
    andClauses.push({
      $or: [{ onSale: true }, { promocao: true }, { promotion: true }, { originalPrice: { $gt: 0 } }],
    });
  }

  if (andClauses.length > 0) {
    query.$and = [...(query.$and ?? []), ...andClauses];
  }

  // Catálogo público: esconder inativos mesmo com dados legados (boolean/string/numérico).
  query.status = { $nin: INACTIVE_STATUS_VALUES };

  // Paginação
  const page = filters?.page || 1;
  const limit = filters?.limit || 12;
  const skip = (page - 1) * limit;

  // Ordenação
  const sortOption = filters?.sort || 'relevance';
  const sortSpec: [string, 1 | -1][] =
    sortOption === 'price_asc'
      ? [['price', 1]]
      : sortOption === 'price_desc'
        ? [['price', -1]]
        : sortOption === 'name_asc'
          ? [['name', 1]]
          : sortOption === 'best_selling'
            ? [['soldCount', -1], ['createdAt', -1]]
            : [['createdAt', -1]];

  // Buscar produtos
  const products = await productsCollection
    .find(query)
    .sort(sortSpec)
    .skip(skip)
    .limit(limit)
    .toArray();

  // Evita N+1: resolve categorias dos itens em lote.
  const categoryIds: ObjectId[] = [];
  for (const product of products as any[]) {
    if (product.categoryId instanceof ObjectId) {
      categoryIds.push(product.categoryId);
      continue;
    }
    if (
      typeof product.categoryId === 'string' &&
      product.categoryId.trim() &&
      ObjectId.isValid(product.categoryId)
    ) {
      categoryIds.push(new ObjectId(product.categoryId));
    }
  }
  const uniqueCategoryIds = Array.from(
    new Map(categoryIds.map((id) => [id.toString(), id])).values()
  );
  const categories = uniqueCategoryIds.length
    ? await categoriesCollection.find({ _id: { $in: uniqueCategoryIds } }).toArray()
    : [];
  const categoryById = new Map(categories.map((c: any) => [c._id.toString(), c]));

  const productsWithCategories = products.map((product: any) => {
    let category: any = null;
    if (product.categoryId instanceof ObjectId) {
      category = categoryById.get(product.categoryId.toString()) ?? null;
    } else if (
      typeof product.categoryId === 'string' &&
      product.categoryId.trim() &&
      ObjectId.isValid(product.categoryId)
    ) {
      category = categoryById.get(product.categoryId) ?? null;
    }
    const rawImageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
    const cleanImageUrls = rawImageUrls
      .map((u: unknown) => (typeof u === 'string' ? u.trim() : ''))
      .filter((u: string) => u.length > 0);
    const primaryImageUrl =
      (typeof product.imageUrl === 'string' ? product.imageUrl.trim() : '') ||
      cleanImageUrls[0] ||
      null;

    return {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      pricePrazo: product.pricePrazo ?? null,
      stock: product.stock,
      minStock: product.minStock ?? null,
      weight: product.weight ?? null,
      dimensionsCm: product.dimensionsCm ?? null,
      imageUrl: primaryImageUrl,
      imageUrls: cleanImageUrls,
      featured: product.featured,
      onSale: Boolean(product.onSale ?? product.promocao ?? product.promotion),
      marca: product.marca ?? null,
      subcategoria: product.subcategoria ?? null,
      material: product.material ?? product.materialTipo ?? null,
      acabamento: product.acabamento ?? product.corAcabamento ?? null,
      tipo: product.tipo ?? product.toolType ?? null,
      bitola: product.bitola ?? null,
      voltagem: product.voltagem ?? product.tensao ?? null,
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
  });

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

const escapeMongoRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Lista produtos para o painel admin (mesma base que o dashboard / vitrine).
 * Usa o driver nativo para tolerar `status` e outros campos em formatos mistos
 * (ex.: importações com `status: "imported"`), que quebram o `findMany` do Prisma.
 */
export async function listAdminProductsFromMongo(searchParams: URLSearchParams): Promise<{
  products: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    minStock: number | null;
    weight: number | null;
    imageUrl: string | null;
    categoryId: string;
    featured: boolean;
    codigo: string | null;
    cost: number | null;
    pricePrazo: number | null;
    unidade: string | null;
    codBarra: string | null;
    marca: string | null;
    subcategoria: string | null;
    origin: string | null;
    status: boolean;
    category: { id: string; name: string };
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  const categoriesCollection = db.collection('categories');

  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const skip = (page - 1) * limit;

  const sortParam = (searchParams.get('sort') ?? '').trim();
  const dirParam = (searchParams.get('dir') ?? '').trim().toLowerCase();
  const dir: 1 | -1 = dirParam === 'asc' ? 1 : -1;
  const allowedSort: Record<string, string> = {
    updatedAt: 'updatedAt',
    name: 'name',
    codigo: 'codigo',
    marca: 'marca',
    price: 'price',
    stock: 'stock',
    category: 'category', // especial (lookup)
  };
  const sortKey = Object.prototype.hasOwnProperty.call(allowedSort, sortParam)
    ? sortParam
    : 'updatedAt';

  const and: Record<string, unknown>[] = [];

  const q = (searchParams.get('q') ?? '').trim();
  if (q) {
    const rx = new RegExp(escapeMongoRegex(q), 'i');
    const matchingCats = await categoriesCollection
      .find({ name: { $regex: escapeMongoRegex(q), $options: 'i' } })
      .project({ _id: 1 })
      .toArray();
    const categoryClauses: Record<string, unknown>[] = [];
    for (const c of matchingCats) {
      categoryClauses.push({ categoryId: c._id });
      categoryClauses.push({ categoryId: c._id.toString() });
    }
    and.push({
      $or: [
        { name: rx },
        { slug: rx },
        { description: rx },
        { codigo: rx },
        { codBarra: rx },
        { marca: rx },
        ...categoryClauses,
      ],
    });
  }

  const categoryId = searchParams.get('categoryId');
  if (categoryId && categoryId !== 'all' && ObjectId.isValid(categoryId)) {
    const oid = new ObjectId(categoryId);
    and.push({ $or: [{ categoryId: oid }, { categoryId: categoryId }] });
  }

  const catalog = searchParams.get('catalog') ?? 'all';
  /**
   * IMPORTANTE: alinhar "ativo/inativo" do admin com a vitrine:
   * - Vitrine esconde quaisquer valores em `INACTIVE_STATUS_VALUES` (inclui strings legadas/pipeline).
   * - Admin "Só ativos": mesmos critérios da vitrine (status NOT IN ...).
   * - Admin "Só inativos": status IN ... (inclui pending_review/imported/rejected etc.).
   */
  if (catalog === 'active') and.push({ status: { $nin: INACTIVE_STATUS_VALUES } });
  if (catalog === 'inactive') and.push({ status: { $in: INACTIVE_STATUS_VALUES } });

  const stock = searchParams.get('stock') ?? 'all';
  if (stock === 'in_stock') and.push({ stock: { $gt: 0 } });
  if (stock === 'out') and.push({ stock: { $lte: 0 } });

  const featured = searchParams.get('featured') ?? 'all';
  if (featured === 'yes') and.push({ featured: true });
  if (featured === 'no') and.push({ featured: false });

  const marca = (searchParams.get('marca') ?? '').trim();
  if (marca) {
    and.push({ marca: { $regex: `^${escapeMongoRegex(marca)}$`, $options: 'i' } });
  }

  const subcategoria = (searchParams.get('subcategoria') ?? '').trim();
  if (subcategoria) {
    and.push({ subcategoria: { $regex: `^${escapeMongoRegex(subcategoria)}$`, $options: 'i' } });
  }

  const query = and.length ? { $and: and } : {};

  const totalPromise = productsCollection.countDocuments(query);
  const docsPromise =
    sortKey === 'category'
      ? productsCollection
          .aggregate([
            { $match: query },
            {
              $addFields: {
                _catId: {
                  $cond: [
                    { $eq: [{ $type: '$categoryId' }, 'objectId'] },
                    '$categoryId',
                    {
                      $convert: {
                        input: '$categoryId',
                        to: 'objectId',
                        onError: null,
                        onNull: null,
                      },
                    },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'categories',
                localField: '_catId',
                foreignField: '_id',
                as: '_cat',
              },
            },
            { $unwind: { path: '$_cat', preserveNullAndEmptyArrays: true } },
            {
              $addFields: {
                _categorySort: { $toLower: { $ifNull: ['$_cat.name', ''] } },
              },
            },
            { $sort: { _categorySort: dir, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _cat: 0, _catId: 0, _categorySort: 0 } },
          ])
          .toArray()
      : productsCollection
          .find(query)
          .sort({ [allowedSort[sortKey]]: dir, _id: -1 } as any)
          .skip(skip)
          .limit(limit)
          .toArray();

  const [total, docs] = await Promise.all([totalPromise, docsPromise]);

  const categoryIds: ObjectId[] = [];
  for (const product of docs as any[]) {
    const cid = product.categoryId;
    if (cid instanceof ObjectId) categoryIds.push(cid);
    else if (typeof cid === 'string' && cid.trim() && ObjectId.isValid(cid)) {
      categoryIds.push(new ObjectId(cid));
    }
  }
  const uniqueCategoryIds = Array.from(
    new Map(categoryIds.map((id) => [id.toString(), id])).values()
  );
  const categories = uniqueCategoryIds.length
    ? await categoriesCollection.find({ _id: { $in: uniqueCategoryIds } }).toArray()
    : [];
  const categoryById = new Map(categories.map((c: any) => [c._id.toString(), c]));

  const products = (docs as any[]).map((p) => {
    const cid = p.categoryId;
    let cat: any = null;
    if (cid instanceof ObjectId) cat = categoryById.get(cid.toString());
    else if (typeof cid === 'string' && cid.trim() && ObjectId.isValid(cid)) {
      cat = categoryById.get(cid) ?? null;
    }

    // Mesma semântica do catálogo público: qualquer valor "inativo" (inclui strings) deve ser tratado como oculto.
    const statusBool = !isInactiveProductStatus(p.status);

    return {
      id: p._id.toString(),
      name: String(p.name ?? ''),
      slug: String(p.slug ?? ''),
      description: String(p.description ?? ''),
      price: typeof p.price === 'number' && Number.isFinite(p.price) ? p.price : Number(p.price) || 0,
      stock: typeof p.stock === 'number' && Number.isFinite(p.stock) ? Math.trunc(p.stock) : Number(p.stock) || 0,
      minStock:
        typeof p.minStock === 'number' && Number.isFinite(p.minStock) ? Math.trunc(p.minStock) : null,
      weight: typeof p.weight === 'number' && Number.isFinite(p.weight) ? p.weight : p.weight ?? null,
      imageUrl: p.imageUrl ?? null,
      categoryId: cid instanceof ObjectId ? cid.toString() : typeof cid === 'string' ? cid : '',
      featured: Boolean(p.featured),
      codigo: p.codigo != null ? String(p.codigo) : null,
      cost: typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : null,
      pricePrazo:
        typeof p.pricePrazo === 'number' && Number.isFinite(p.pricePrazo) ? p.pricePrazo : null,
      unidade: p.unidade != null ? String(p.unidade) : null,
      codBarra: p.codBarra != null ? String(p.codBarra) : null,
      marca: p.marca != null ? String(p.marca) : null,
      subcategoria: p.subcategoria != null ? String(p.subcategoria) : null,
      origin: p.origin != null ? String(p.origin) : null,
      status: statusBool,
      category: cat
        ? { id: cat._id.toString(), name: String(cat.name ?? '') }
        : {
            id: cid instanceof ObjectId ? cid.toString() : typeof cid === 'string' ? cid : '',
            name: '—',
          },
    };
  });

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * Opções de filtros (admin): valores distintos para `marca` e `subcategoria`.
 * Usa a mesma semântica de filtros do admin (categoryId, catalog, stock, featured, q),
 * mas não aplica os filtros de marca/subcategoria em si (para não "auto-restringir" o dropdown).
 */
export async function getAdminProductFilterOptionsFromMongo(
  searchParams: URLSearchParams
): Promise<{
  marcas: string[];
  subcategorias: string[];
}> {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  const categoriesCollection = db.collection('categories');

  const and: Record<string, unknown>[] = [];

  const q = (searchParams.get('q') ?? '').trim();
  if (q) {
    const rx = new RegExp(escapeMongoRegex(q), 'i');
    const matchingCats = await categoriesCollection
      .find({ name: { $regex: escapeMongoRegex(q), $options: 'i' } })
      .project({ _id: 1 })
      .toArray();
    const categoryClauses: Record<string, unknown>[] = [];
    for (const c of matchingCats) {
      categoryClauses.push({ categoryId: c._id });
      categoryClauses.push({ categoryId: c._id.toString() });
    }
    and.push({
      $or: [
        { name: rx },
        { slug: rx },
        { description: rx },
        { codigo: rx },
        { codBarra: rx },
        { marca: rx },
        ...categoryClauses,
      ],
    });
  }

  const categoryId = searchParams.get('categoryId');
  if (categoryId && categoryId !== 'all' && ObjectId.isValid(categoryId)) {
    const oid = new ObjectId(categoryId);
    and.push({ $or: [{ categoryId: oid }, { categoryId: categoryId }] });
  }

  const catalog = searchParams.get('catalog') ?? 'all';
  if (catalog === 'active') and.push({ status: { $nin: INACTIVE_STATUS_VALUES } });
  if (catalog === 'inactive') and.push({ status: { $in: INACTIVE_STATUS_VALUES } });

  const stock = searchParams.get('stock') ?? 'all';
  if (stock === 'in_stock') and.push({ stock: { $gt: 0 } });
  if (stock === 'out') and.push({ stock: { $lte: 0 } });

  const featured = searchParams.get('featured') ?? 'all';
  if (featured === 'yes') and.push({ featured: true });
  if (featured === 'no') and.push({ featured: false });

  const query = and.length ? { $and: and } : {};

  const [marcasRaw, subcatsRaw] = await Promise.all([
    productsCollection.distinct('marca', query),
    productsCollection.distinct('subcategoria', query),
  ]);

  const clean = (arr: any[]) =>
    arr
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0 && x !== '—' && x !== '-')
      .sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));

  return {
    marcas: clean(marcasRaw as any[]),
    subcategorias: clean(subcatsRaw as any[]),
  };
}

export async function getProductFilterOptions(filters?: {
  search?: string;
  categorySlug?: string;
  subcategorias?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  /** Só faz sentido com `categorySlug`: lista subcategorias (grupos) dentro da macro. */
  includeSubcategorias?: boolean;
}): Promise<{
  marcas: string[];
  materiais: string[];
  acabamentos: string[];
  tipos: string[];
  bitolas: string[];
  voltagens: string[];
  subcategorias: string[];
  maxPrice: number;
}> {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  const categoriesCollection = db.collection('categories');

  const query: any = {};

  if (filters?.search) {
    const safe = escapeMongoRegex(filters.search.trim());
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { slug: { $regex: safe, $options: 'i' } },
    ];
  }

  if (filters?.categorySlug) {
    const category = await categoriesCollection.findOne({ slug: filters.categorySlug });
    if (category) {
      const objectIds: ObjectId[] = [category._id];
      const stringIds = new Set<string>([category._id.toString()]);
      const queue: string[] = [category._id.toString()];
      while (queue.length > 0) {
        const parentId = queue.shift()!;
        const parentMatch: any[] = [{ parentId }];
        if (ObjectId.isValid(parentId)) {
          parentMatch.push({ parentId: new ObjectId(parentId) });
        }
        const children = await categoriesCollection
          .find({ $or: parentMatch }, { projection: { _id: 1 } })
          .toArray();
        for (const child of children) {
          const childId = child._id.toString();
          if (stringIds.has(childId)) continue;
          objectIds.push(child._id);
          stringIds.add(childId);
          queue.push(childId);
        }
      }
      query.categoryId = { $in: [...objectIds, ...Array.from(stringIds)] };
    }
  }

  if (filters?.minPrice || filters?.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }

  query.status = { $nin: INACTIVE_STATUS_VALUES };
  if (filters?.inStock) query.stock = { $gt: 0 };
  if (filters?.onSale) {
    query.$and = [
      ...(query.$and ?? []),
      { $or: [{ onSale: true }, { promocao: true }, { promotion: true }, { originalPrice: { $gt: 0 } }] },
    ];
  }

  /** Match sem filtro de subcategoria: usado para listar todas as subcategorias da macro. */
  const queryForSubcatList: any = { ...query };
  if (Array.isArray(query.$and)) queryForSubcatList.$and = [...query.$and];

  const subcats = filters?.subcategorias?.map((v) => v.trim()).filter(Boolean) ?? [];
  if (subcats.length > 0) {
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$and = [
      ...(query.$and ?? []),
      {
        $or: subcats.map((value) => ({
          subcategoria: { $regex: `^${escapeRegex(value)}$`, $options: 'i' },
        })),
      },
    ];
  }

  const wantSubcats =
    filters?.includeSubcategorias === true &&
    Boolean(filters?.categorySlug?.trim());

  const [
    marcasRaw,
    materiaisRaw,
    materiaisAltRaw,
    acabRaw,
    acabAltRaw,
    tiposRaw,
    tiposAltRaw,
    bitolasRaw,
    voltagensRaw,
    voltagensAltRaw,
    subcategoriasRaw,
    maxPriceAgg,
  ] = await Promise.all([
    productsCollection.distinct('marca', query),
    productsCollection.distinct('material', query),
    productsCollection.distinct('materialTipo', query),
    productsCollection.distinct('acabamento', query),
    productsCollection.distinct('corAcabamento', query),
    productsCollection.distinct('tipo', query),
    productsCollection.distinct('toolType', query),
    productsCollection.distinct('bitola', query),
    productsCollection.distinct('voltagem', query),
    productsCollection.distinct('tensao', query),
    wantSubcats
      ? productsCollection.distinct('subcategoria', queryForSubcatList)
      : Promise.resolve([]),
    productsCollection
      .aggregate([{ $match: query }, { $group: { _id: null, maxPrice: { $max: '$price' } } }])
      .toArray(),
  ]);

  const marcas = (marcasRaw as any[])
    .map((x) => String(x ?? '').trim())
    .filter((x) => x.length > 0 && x !== '—' && x !== '-')
    .sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));

  const clean = (arr: any[]) =>
    arr
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0 && x !== '—' && x !== '-' && x !== 'Sem grupo')
      .sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));

  const uniq = (arr: string[]) => Array.from(new Set(arr));

  const materiais = uniq(clean([...(materiaisRaw as any[]), ...(materiaisAltRaw as any[])]));
  const acabamentos = uniq(clean([...(acabRaw as any[]), ...(acabAltRaw as any[])]));
  const tipos = uniq(clean([...(tiposRaw as any[]), ...(tiposAltRaw as any[])]));
  const bitolas = uniq(clean(bitolasRaw as any[]));
  const voltagens = uniq(clean([...(voltagensRaw as any[]), ...(voltagensAltRaw as any[])]));
  const subcategorias = wantSubcats ? uniq(clean(subcategoriasRaw as any[])) : [];
  const maxPrice = Number(maxPriceAgg?.[0]?.maxPrice ?? 0);

  return { marcas, materiais, acabamentos, tipos, bitolas, voltagens, subcategorias, maxPrice };
}

export async function getProductBySlug(slug: string) {
  const db = await connectToDatabase();
  const productsCollection = db.collection('products');
  const categoriesCollection = db.collection('categories');

  const product = await productsCollection.findOne({ slug });

  if (!product) {
    return null;
  }

  if (isInactiveProductStatus(product.status)) {
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
    pricePrazo: product.pricePrazo ?? null,
    stock: product.stock,
    minStock: product.minStock ?? null,
    weight: product.weight ?? null,
    dimensionsCm: product.dimensionsCm ?? null,
    imageUrl:
      (typeof product.imageUrl === 'string' ? product.imageUrl.trim() : '') ||
      (Array.isArray(product.imageUrls)
        ? product.imageUrls
            .map((u: unknown) => (typeof u === 'string' ? u.trim() : ''))
            .filter((u: string) => u.length > 0)[0] ?? null
        : null),
    imageUrls: Array.isArray(product.imageUrls)
      ? product.imageUrls
          .map((u: unknown) => (typeof u === 'string' ? u.trim() : ''))
          .filter((u: string) => u.length > 0)
      : [],
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
  const productsCollection = db.collection('products');

  const categories = await categoriesCollection
    .find({})
    .sort({ isRoot: -1, sortOrder: 1, name: 1 })
    .toArray();

  const countsAgg = await productsCollection
    .aggregate<{ _id: any; count: number }>([
      {
        $match: {
          categoryId: { $ne: null },
          status: { $nin: INACTIVE_STATUS_VALUES },
        },
      },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ])
    .toArray();

  const directCountByCategoryId = new Map<string, number>();
  for (const row of countsAgg) {
    const key =
      row._id instanceof ObjectId ? row._id.toString() : String(row._id ?? '').trim();
    if (!key) continue;
    directCountByCategoryId.set(key, Number(row.count ?? 0));
  }

  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    const parent = category.parentId ? String(category.parentId) : '';
    if (!parent) continue;
    const arr = childrenByParent.get(parent) ?? [];
    arr.push(category._id.toString());
    childrenByParent.set(parent, arr);
  }

  const subtreeMemo = new Map<string, number>();
  const calcSubtreeCount = (categoryId: string): number => {
    const cached = subtreeMemo.get(categoryId);
    if (cached != null) return cached;
    let total = directCountByCategoryId.get(categoryId) ?? 0;
    const children = childrenByParent.get(categoryId) ?? [];
    for (const childId of children) total += calcSubtreeCount(childId);
    subtreeMemo.set(categoryId, total);
    return total;
  };

  return categories.map((category: any) => ({
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId ? String(category.parentId) : null,
    isRoot: category.isRoot === true,
    isActive: category.isActive !== false,
    sortOrder: Number(category.sortOrder ?? 999),
    _count: {
      products: calcSubtreeCount(category._id.toString()),
      directProducts: directCountByCategoryId.get(category._id.toString()) ?? 0,
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

export type QuoteRequestFollowUpStatus = 'new' | 'claimed' | 'contacted' | 'in_progress' | 'done';

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
    followUpStatus: normalizeFollowUpStatus(doc.followUpStatus),
    assignedToUserId: doc.assignedToUserId != null ? String(doc.assignedToUserId) : null,
    assignedToName: doc.assignedToName != null ? String(doc.assignedToName) : null,
    assignedAt: doc.assignedAt ?? null,
    contactedAt: doc.contactedAt ?? null,
    followUpNotes: doc.followUpNotes != null ? String(doc.followUpNotes).slice(0, 4000) : null,
    proposal: normalizeQuoteProposalDoc(doc.proposal),
    proposalSentAt: doc.proposalSentAt ?? null,
    clientDecision: normalizeClientDecision(doc.clientDecision, doc.proposalSentAt),
    clientDecidedAt: doc.clientDecidedAt ?? null,
    linkedOrderId: doc.linkedOrderId != null ? String(doc.linkedOrderId) : null,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}

function normalizeFollowUpStatus(raw: any): QuoteRequestFollowUpStatus {
  return raw === 'claimed' ||
    raw === 'contacted' ||
    raw === 'in_progress' ||
    raw === 'done'
    ? raw
    : 'new';
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
  /** Só pedidos ainda sem follow-up atribuído (estado `new` ou ausente). */
  followUpNewOnly?: boolean;
  /** Filtro de responsável: ninguém, alguém, ou o utilizador corrente. */
  assignee?: 'any' | 'none' | 'me';
  /** Obrigatório se `assignee` === `me` (comparar com `assignedToUserId`). */
  actorUserId?: string;
}) {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 30, 100);
  const skip = (page - 1) * limit;

  const clauses: Record<string, unknown>[] = [];
  if (filters?.status && filters.status !== 'all') {
    clauses.push({ status: filters.status });
  }
  if (filters?.followUpNewOnly) {
    clauses.push({
      $or: [
        { followUpStatus: { $exists: false } },
        { followUpStatus: null },
        { followUpStatus: 'new' },
      ],
    });
  }
  if (filters?.assignee === 'none') {
    clauses.push({
      $or: [{ assignedToUserId: { $exists: false } }, { assignedToUserId: null }, { assignedToUserId: '' }],
    });
  } else if (filters?.assignee === 'any') {
    clauses.push({
      assignedToUserId: { $exists: true, $nin: [null, ''] },
    });
  } else if (filters?.assignee === 'me' && filters.actorUserId) {
    clauses.push({ assignedToUserId: filters.actorUserId });
  }

  const query: Record<string, unknown> =
    clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0]! : { $and: clauses };

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

export async function claimQuoteRequest(params: {
  id: string;
  actorUserId: string;
  actorName: string;
  /** Se true, sobrescreve responsável atual */
  force?: boolean;
}): Promise<{ ok: boolean; alreadyClaimed?: boolean; notFound?: boolean }> {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(params.id);
  } catch {
    return { ok: false, notFound: true };
  }

  const now = new Date();
  const filter: any = { _id: oid };
  if (!params.force) {
    filter.$or = [{ assignedToUserId: { $exists: false } }, { assignedToUserId: null }];
  }

  const res = await col.updateOne(filter, {
    $set: {
      followUpStatus: 'claimed',
      assignedToUserId: params.actorUserId,
      assignedToName: params.actorName,
      assignedAt: now,
      updatedAt: now,
    },
  });

  if (res.matchedCount <= 0) {
    const existing = await col.findOne({ _id: oid }, { projection: { assignedToUserId: 1 } });
    if (!existing) return { ok: false, notFound: true };
    return { ok: false, alreadyClaimed: true };
  }

  return { ok: true };
}

export async function releaseQuoteRequest(params: {
  id: string;
  actorUserId: string;
  /** Se true, libera mesmo se outro responsável */
  force?: boolean;
}): Promise<{ ok: boolean; notFound?: boolean; forbidden?: boolean }> {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(params.id);
  } catch {
    return { ok: false, notFound: true };
  }

  const now = new Date();
  const filter: any = { _id: oid };
  if (!params.force) {
    filter.assignedToUserId = params.actorUserId;
  }

  const res = await col.updateOne(filter, {
    $set: { followUpStatus: 'new', updatedAt: now },
    $unset: { assignedToUserId: '', assignedToName: '', assignedAt: '' },
  });

  if (res.matchedCount > 0) return { ok: true };

  const existing = await col.findOne({ _id: oid }, { projection: { assignedToUserId: 1 } });
  if (!existing) return { ok: false, notFound: true };
  return { ok: false, forbidden: true };
}

export async function markQuoteRequestContacted(params: {
  id: string;
  actorUserId: string;
  actorName: string;
}): Promise<{ ok: boolean; notFound?: boolean }> {
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(params.id);
  } catch {
    return { ok: false, notFound: true };
  }

  const now = new Date();
  const res = await col.updateOne(
    { _id: oid },
    {
      $set: {
        followUpStatus: 'contacted',
        contactedAt: now,
        // Se ninguém assumiu ainda, registra quem marcou.
        assignedToUserId: params.actorUserId,
        assignedToName: params.actorName,
        assignedAt: now,
        updatedAt: now,
      },
    }
  );
  if (res.matchedCount <= 0) return { ok: false, notFound: true };
  return { ok: true };
}

export async function appendQuoteRequestFollowUpNote(params: {
  id: string;
  note: string;
}): Promise<{ ok: boolean; notFound?: boolean }> {
  const note = String(params.note ?? '').trim().slice(0, 4000);
  if (!note) return { ok: true };
  const db = await connectToDatabase();
  const col = db.collection('quote_requests');
  let oid: ObjectId;
  try {
    oid = new ObjectId(params.id);
  } catch {
    return { ok: false, notFound: true };
  }
  const now = new Date();
  const res = await col.updateOne(
    { _id: oid },
    {
      $set: {
        followUpNotes: note,
        updatedAt: now,
      },
    }
  );
  if (res.matchedCount <= 0) return { ok: false, notFound: true };
  return { ok: true };
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