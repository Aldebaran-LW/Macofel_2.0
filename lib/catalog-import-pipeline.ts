// lib/catalog-import-pipeline.ts
import type { Collection, Document } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase } from './mongodb-native';
import mongoPrisma from '@/lib/mongodb';
import {
  getBuscarProdutoInfoByBarcode,
  hasBarcodeWebLookupApisConfigured,
  probeGoogleCustomSearchApi,
} from '@/lib/buscar-produto-service';
import { normalizeValidGtin } from '@/lib/gtin-validate';
import {
  CATALOG_AGENT_GEMINI_MODEL,
  GEMINI_API_KEY,
  MAX_CATALOG_BATCH,
} from '@/env';

import {
  buildImportDescription,
  importRowSlug,
  parseRelatorioEstoqueWorkbook,
  type RelatorioEstoqueRow,
} from './relatorio-estoque-xls';
import {
  buildPdfImportDescription,
  parseRelatorioProdutosPdf,
  pdfRowSlug,
  pdfRowToCatalogPrice,
  type RelatorioProdutoPdfRow,
} from './relatorio-produtos-pdf';
import { parseRelatorioEstoqueWordLike } from './relatorio-estoque-doc-word';

/** Um probe por processo Node — evita bater na CSE em cada produto falhado. */
let cseProbeCached: Promise<
  Awaited<ReturnType<typeof probeGoogleCustomSearchApi>>
> | null = null;

function getCseProbeOnce(): Promise<
  Awaited<ReturnType<typeof probeGoogleCustomSearchApi>>
> {
  cseProbeCached ??= probeGoogleCustomSearchApi();
  return cseProbeCached;
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: CATALOG_AGENT_GEMINI_MODEL || 'gemini-2.0-flash',
});

const VALID_CATEGORIES = [
  'cimento-argamassa',
  'tijolos-blocos',
  'tintas-acessorios',
  'ferramentas',
  'material-hidraulico',
  'material-eletrico',
] as const;

/**
 * Preço a prazo unitário vindo do relatório. Usa `Record` porque versões antigas do tipo
 * `RelatorioEstoqueRow` no repo não declaram `pricePrazo` / `vlVendaPrazo` (build Vercel).
 */
function relatorioRowPricePrazo(row: RelatorioEstoqueRow): number | null {
  const r = row as unknown as Record<string, unknown>;
  const asPositiveNum = (v: unknown): number | null => {
    if (typeof v === 'number' && v > 0 && Number.isFinite(v)) return v;
    return null;
  };
  return (
    asPositiveNum(r.pricePrazo) ??
    asPositiveNum(r.vlVendaPrazo) ??
    null
  );
}

function rowFromRelatorioEstoque(row: RelatorioEstoqueRow): Record<string, unknown> {
  return {
    name: row.name,
    codigo: row.code,
    description: buildImportDescription(row),
    price: row.price,
    pricePrazo: relatorioRowPricePrazo(row),
    stock: row.stock,
    marca: row.marca,
    slug: importRowSlug(row.code, row.name),
    category: row.grupo || '',
  };
}

function rowFromPdf(r: RelatorioProdutoPdfRow): Record<string, unknown> {
  return {
    name: r.produto,
    codigo: r.codigo,
    description: buildPdfImportDescription(r),
    price: pdfRowToCatalogPrice(r),
    pricePrazo:
      r.vendaPrazo > 0 && Number.isFinite(r.vendaPrazo) ? r.vendaPrazo : null,
    stock: r.estoque,
    marca: '',
    slug: pdfRowSlug(r),
    category: '',
  };
}

/**
 * Mesma lógica que `loadRawRowsFromFile`, mas com `ArrayBuffer` (download Blob / buffer).
 * Usada pela importação rápida (`saveProductsForReviewFast`).
 */
export async function parseCatalogSourceToRows(
  ab: ArrayBuffer,
  fileName: string
): Promise<unknown[]> {
  const n = fileName.toLowerCase();

  if (n.endsWith('.xlsx') || n.endsWith('.xls')) {
    const { rows, warnings } = parseRelatorioEstoqueWorkbook(ab, { fileName });
    for (const w of warnings) console.warn('[catalog-import]', w);
    return rows.map(rowFromRelatorioEstoque);
  }

  if (n.endsWith('.pdf')) {
    const { rows, warnings } = await parseRelatorioProdutosPdf(ab);
    for (const w of warnings) console.warn('[catalog-import]', w);
    return rows.map(rowFromPdf);
  }

  if (
    n.endsWith('.txt') ||
    n.endsWith('.rtf') ||
    n.endsWith('.doc') ||
    n.endsWith('.docx')
  ) {
    const { rows, warnings } = await parseRelatorioEstoqueWordLike(ab, fileName);
    for (const w of warnings) console.warn('[catalog-import]', w);
    return rows.map(rowFromRelatorioEstoque);
  }

  if (n.endsWith('.json')) {
    const text = Buffer.from(ab).toString('utf8');
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  throw new Error('Formato não suportado. Use .xlsx, .pdf, .txt, .docx ou .json');
}

/** Parsers reais devolvem `{ rows, warnings }`; aqui normalizamos para linhas genéricas. */
async function loadRawRowsFromFile(file: File, fileName: string): Promise<unknown[]> {
  const ab = await file.arrayBuffer();
  return parseCatalogSourceToRows(ab, fileName);
}

export type CatalogImportMeta = {
  catalog_import_file_name?: string;
  catalog_import_user_id?: string;
  catalog_import_source_url?: string;
};

export async function processCatalogImport(
  file: File,
  fileName: string,
  meta?: CatalogImportMeta
) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada');
  }

  let rawRows: unknown[] = [];

  try {
    rawRows = await loadRawRowsFromFile(file, fileName);

    if (!Array.isArray(rawRows)) {
      rawRows = [rawRows];
    }

    const batch = rawRows.slice(0, MAX_CATALOG_BATCH);
    const processed: Record<string, unknown>[] = [];
    const metaRow =
      meta && Object.values(meta).some((v) => v != null && String(v).length > 0)
        ? { ...meta }
        : {};

    for (const row of batch) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      try {
        const cleaned = cleanImportRow(row as Record<string, unknown>);
        const subcategoriaGrupo = String(cleaned.category ?? '').trim();
        const enriched = await enrichWithGemini(cleaned);
        const categorized = await categorizeProduct(enriched);
        const macroSlug = String(
          categorized.macroCategorySlug ?? categorized.category ?? ''
        ).trim();

        processed.push({
          ...categorized,
          subcategoria: subcategoriaGrupo,
          macroCategorySlug: macroSlug,
          status: 'pending_review',
          created_at: new Date(),
          reviewed_at: null,
          review_status: 'pending',
          review_notes: null,
          ...metaRow,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[catalog-import] Erro ao processar linha:', msg);
      }
    }

    if (processed.length === 0) {
      throw new Error('Nenhum produto válido foi processado.');
    }

    const db = await connectToDatabase();
    const result = await db.collection('products').insertMany(processed);

    console.log(
      `[catalog-import] ${result.insertedCount} produtos salvos como pending_review`
    );

    return {
      success: true,
      processed: processed.length,
      insertedCount: result.insertedCount,
    };
  } catch (error: unknown) {
    console.error('[catalog-import] Erro geral:', error);
    throw error;
  }
}

export function cleanImportRow(row: Record<string, unknown>) {
  const name = String(row.name ?? row.Produto ?? '').trim();
  const pp = row.pricePrazo ?? row['Venda Prazo'];
  const codBarraRaw = row.codBarra ?? row.cod_barra ?? row.ean;
  const codBarra =
    typeof codBarraRaw === 'string' || typeof codBarraRaw === 'number'
      ? String(codBarraRaw).replace(/\D/g, '') || ''
      : '';
  return {
    name,
    codigo: String(row.codigo ?? row.Codigo ?? '').trim(),
    description: String(row.description ?? '').trim(),
    price: parseFloat(String(row.price ?? row['Venda Vista'] ?? '0')) || 0,
    pricePrazo:
      pp != null && pp !== '' ? parseFloat(String(pp)) : null,
    stock: parseInt(String(row.stock ?? row.Estoque ?? '0'), 10) || 0,
    marca: String(row.marca ?? row.Marca ?? '').trim(),
    slug:
      String(row.slug ?? '').trim() ||
      name.toLowerCase().replace(/\s+/g, '-'),
    imageUrl: row.imageUrl != null ? row.imageUrl : null,
    category: String(row.category ?? '').trim(),
    codBarra,
  };
}

export type CleanCatalogRow = ReturnType<typeof cleanImportRow>;

/**
 * Título comercial alinhado ao EAN (ML / Google+Gemini), igual ao pré-enriquecimento em
 * `applyGeminiEnrichmentToCatalogDocument`. Persistir em `web_title` no Mongo para revisão,
 * export JSON (`catalog-agent`) e coerência com o agente Python.
 */
export async function fetchCatalogRowWebTitle(normalized: CleanCatalogRow): Promise<string | null> {
  const ean = normalizeValidGtin(normalized.codBarra);
  if (!ean) return null;
  const name = String(normalized.name ?? '').trim();
  if (!name) return null;
  try {
    const info = await getBuscarProdutoInfoByBarcode(ean, name);
    return info?.title?.trim() || null;
  } catch {
    return null;
  }
}

type BarcodeVerifiedContext = { apiTitle: string; source?: string; ean: string };

type BarcodeWebMedia = {
  photos: string[];
  weight_grams: number | null;
  dimensions_cm: string | null;
};

async function geminiBarcodeCoherence(
  storeName: string,
  storeDescription: string,
  gtinTitle: string,
  ean: string
): Promise<boolean> {
  const desc = storeDescription.slice(0, 500);
  const prompt = `É o mesmo produto físico comercializado?

EAN/GTIN: ${ean}
Nome no cadastro da loja: ${storeName}
Descrição na loja (trecho): ${desc || '(vazia)'}
Título encontrado em bases de dados de código de barras (validado com o EAN no anúncio ou snippet): ${gtinTitle}

Responde APENAS uma palavra: SIM ou NÃO.
SIM = é razoavelmente o mesmo artigo (marca, linha ou tipo de produto coerentes).
NÃO = produto diferente, genérico demais, ou título não condiz com o nome/descrição da loja.`;

  const result = await model.generateContent(prompt);
  const t = result.response.text().trim().toUpperCase();
  return t.startsWith('SIM') || /^S[\s,.]/.test(t);
}

async function enrichWithGemini(
  product: Record<string, unknown>,
  barcode?: BarcodeVerifiedContext
) {
  const bc = barcode
    ? `
Referência validada pelo código de barras (prioriza estes dados como factuais; harmoniza com o nome da loja sem contradizer o GTIN):
EAN: ${barcode.ean}
Título na base GTIN (${barcode.source ?? 'fonte externa'}): ${barcode.apiTitle}
`
    : '';
  const eanLine = product.codBarra
    ? `Código de barras (EAN/GTIN): ${product.codBarra}\n`
    : '';

  const prompt = `
Escreva uma descrição longa (180-280 palavras), persuasiva e otimizada para SEO para este produto de materiais de construção:

Nome: ${product.name}
Código interno: ${product.codigo}
${eanLine}Marca: ${product.marca}
Descrição original: ${product.description}
${bc}
Use linguagem técnica correta, destaque benefícios práticos, durabilidade, rendimento e aplicação. 
Inclua palavras-chave naturalmente.
`;

  const result = await model.generateContent(prompt);
  return {
    ...product,
    description: result.response.text().trim(),
  };
}

function normalizeCategorySlug(text: string): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? '';
  let category = line.toLowerCase().replace(/\s+/g, '-');
  if ((VALID_CATEGORIES as readonly string[]).includes(category)) return category;
  for (const c of VALID_CATEGORIES) {
    if (category.includes(c)) return c;
  }
  return 'ferramentas';
}

async function resolveCategoryIdFromMacroSlug(macroSlug: string): Promise<string | null> {
  const slug = String(macroSlug ?? '').trim();
  if (!slug) return null;
  const c = await mongoPrisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  return c?.id ?? null;
}

async function categorizeProduct(product: Record<string, unknown>) {
  const prompt = `
Classifique este produto em uma das categorias abaixo. Responda APENAS com o slug exato.

Categorias:
- cimento-argamassa
- tijolos-blocos
- tintas-acessorios
- ferramentas
- material-hidraulico
- material-eletrico

Produto: ${product.name}
Descrição: ${product.description}
Marca: ${product.marca}
`;

  const result = await model.generateContent(prompt);
  const category = normalizeCategorySlug(result.response.text());

  return { ...product, category, macroCategorySlug: category };
}

export async function processCatalogImportFromUrl(
  fileUrl: string,
  fileName: string,
  userId?: string
) {
  if (!fileUrl?.trim()) {
    throw new Error('URL do arquivo é obrigatória');
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(fileUrl, { headers });
  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo (${response.status})`);
  }

  const blob = await response.blob();
  const name = fileName || 'import.json';
  const file = new File([blob], name, {
    type: blob.type || 'application/octet-stream',
  });

  const meta: CatalogImportMeta = {
    catalog_import_source_url: fileUrl,
    catalog_import_file_name: name,
    ...(userId ? { catalog_import_user_id: userId } : {}),
  };

  return await processCatalogImport(file, name, meta);
}

function isLiveCatalogProduct(doc: Record<string, unknown>): boolean {
  return typeof doc.status === 'boolean' && doc.status === true;
}

/**
 * Uma passagem de Gemini + categorização sobre um documento já em `products`.
 * Suporta `status: true` (catálogo ativo) ou `status: 'imported'` (rascunho).
 */
export async function applyGeminiEnrichmentToCatalogDocument(
  col: Collection<Document>,
  doc: Document
): Promise<void> {
  const _id = doc._id;
  const raw = doc as Record<string, unknown>;
  const live = isLiveCatalogProduct(raw);

  try {
    await col.updateOne({ _id }, { $set: { enrichmentStatus: 'running' } });

    const cleaned = cleanImportRow(raw);
    if (!String(cleaned.name ?? '').trim()) {
      await col.updateOne(
        { _id },
        {
          $set: {
            enrichmentStatus: 'failed',
            review_notes: 'Sem nome para enriquecer',
            enrichment_notes: 'Enriquecimento: nome do produto vazio.',
            updatedAt: new Date(),
          },
        }
      );
      return;
    }

  let barcodeCtx: BarcodeVerifiedContext | undefined;
  let barcodeWebMedia: BarcodeWebMedia | null = null;
  if (live) {
    const ean = normalizeValidGtin(raw.codBarra ?? cleaned.codBarra);
    if (!ean) {
      await col.updateOne(
        { _id },
        {
          $set: {
            enrichmentStatus: 'skipped',
            enrichment_notes:
              'Enriquecimento: EAN ausente, formato inválido ou dígito de controlo incorreto.',
            ean_web_match: 'invalid_checksum',
            updatedAt: new Date(),
          },
        }
      );
      return;
    }

    let info: Awaited<ReturnType<typeof getBuscarProdutoInfoByBarcode>> = null;
    try {
      info = await getBuscarProdutoInfoByBarcode(ean, cleaned.name);
    } catch {
      info = null;
    }
    if (!info?.title?.trim()) {
      const apis = hasBarcodeWebLookupApisConfigured();
      let notes: string;
      let eanMatch: string;
      if (!apis) {
        notes =
          'Enriquecimento: o GTIN é válido (GS1), mas a pesquisa por EAN está incompleta — faltam GOOGLE_API_KEY e GOOGLE_CSE_ID no .env (Custom Search), além de GEMINI_API_KEY. ' +
          'Sem o Google CSE, o sistema não confirma o EAN na web e não enriquece; após configurar, volte a enfileirar estes produtos.';
        eanMatch = 'api_incomplete';
      } else {
        const probe = await getCseProbeOnce();
        if (!probe.ok) {
          const detail = probe.message ? ` Google: ${probe.message}` : '';
          notes =
            'Enriquecimento: o GTIN é válido, mas a Google Custom Search API recusou o acesso (HTTP ' +
            probe.httpStatus +
            ').' +
            detail +
            ' Verifique faturação do projeto, restrições da chave "API - Buscas" e se a Custom Search API está ativa no mesmo projeto. Enquanto a CSE falhar, só o Mercado Livre valida o EAN; sem anúncio no ML, não há título web.';
          eanMatch = 'api_incomplete';
        } else {
          notes =
            'Enriquecimento: o GTIN passa no checksum GS1, mas não foi encontrado anúncio/snippet com este EAN (Mercado Livre / Google). ' +
            'Pode ser código de barras trocado no cadastro ou produto sem presença nas fontes.';
          eanMatch = 'no_listing';
        }
      }
      await col.updateOne(
        { _id },
        {
          $set: {
            enrichmentStatus: 'skipped',
            enrichment_notes: notes,
            ean_web_match: eanMatch,
            updatedAt: new Date(),
          },
        }
      );
      return;
    }

    const coherent = await geminiBarcodeCoherence(
      cleaned.name,
      cleaned.description,
      info.title.trim(),
      ean
    );
    if (!coherent) {
      await col.updateOne(
        { _id },
        {
          $set: {
            enrichmentStatus: 'skipped',
            enrichment_notes:
              'Enriquecimento: o EAN foi encontrado na web, mas o título do anúncio não condiz com o nome/descrição da loja. ' +
              'É provável que o código de barras no cadastro não seja deste produto — corrija o EAN ou o nome e volte a enfileirar.',
            ean_web_match: 'incoherent',
            updatedAt: new Date(),
          },
        }
      );
      return;
    }

    barcodeCtx = {
      ean,
      apiTitle: info.title.trim(),
      source: info.source,
    };

    // Captura fotos/peso/dimensões obtidos pela mesma chamada de API para salvar junto à descrição.
    barcodeWebMedia = {
      photos: Array.isArray(info.photos) ? info.photos.filter((u) => /^https?:\/\//i.test(u)) : [],
      weight_grams: info.weight_grams ?? null,
      dimensions_cm: info.dimensions_cm ?? null,
    };
  }

    const subcategoriaGrupo = String(cleaned.category ?? '').trim();
    const enriched = await enrichWithGemini(cleaned, barcodeCtx);
    const categorized = (await categorizeProduct(enriched)) as Record<string, unknown>;
    const macroSlug = String(
      categorized.macroCategorySlug ?? categorized.category ?? ''
    ).trim();

    if (live) {
      const categoryId = await resolveCategoryIdFromMacroSlug(macroSlug);
      const setLive: Record<string, unknown> = {
        name: categorized.name,
        description: categorized.description,
        price: categorized.price,
        pricePrazo: categorized.pricePrazo,
        stock: categorized.stock,
        marca: categorized.marca || null,
        subcategoria: subcategoriaGrupo || null,
        enrichmentStatus: 'done',
        enrichment_notes: null,
        ean_web_match: 'ok',
        updatedAt: new Date(),
      };
      if (categoryId) setLive.categoryId = categoryId;

      // Persiste imagens, peso e dimensões obtidos da validação de EAN (ML / Google+Gemini).
      // Só preenche campos vazios para não sobrescrever dados curados manualmente.
      if (barcodeWebMedia) {
        const existingDoc = raw as Record<string, unknown>;
        const missingImg =
          !existingDoc.imageUrl || !String(existingDoc.imageUrl).trim();
        const missingWeight = existingDoc.weight == null;
        const missingDims =
          !existingDoc.dimensionsCm || !String(existingDoc.dimensionsCm).trim();
        const missingUrls =
          !Array.isArray(existingDoc.imageUrls) ||
          (existingDoc.imageUrls as unknown[]).length === 0;

        if (missingImg && barcodeWebMedia.photos.length > 0) {
          setLive.imageUrl = barcodeWebMedia.photos[0];
        }
        if (missingUrls && barcodeWebMedia.photos.length > 0) {
          setLive.imageUrls = barcodeWebMedia.photos;
        }
        if (missingWeight && barcodeWebMedia.weight_grams != null) {
          setLive.weight = Number(
            (barcodeWebMedia.weight_grams / 1000).toFixed(3)
          );
        }
        if (missingDims && barcodeWebMedia.dimensions_cm) {
          setLive.dimensionsCm = barcodeWebMedia.dimensions_cm;
        }
      }

      await col.updateOne({ _id }, { $set: setLive });
    } else {
      // Tenta buscar imagens/peso/dimensões por EAN também para rascunhos com código de barras válido.
      let draftMedia: BarcodeWebMedia | null = null;
      const draftEan = normalizeValidGtin(cleaned.codBarra);
      if (draftEan) {
        try {
          const draftInfo = await getBuscarProdutoInfoByBarcode(draftEan, cleaned.name);
          if (draftInfo) {
            draftMedia = {
              photos: Array.isArray(draftInfo.photos)
                ? draftInfo.photos.filter((u) => /^https?:\/\//i.test(u))
                : [],
              weight_grams: draftInfo.weight_grams ?? null,
              dimensions_cm: draftInfo.dimensions_cm ?? null,
            };
          }
        } catch {
          // não bloqueia o enriquecimento de texto
        }
      }

      const setDraft: Record<string, unknown> = {
        name: categorized.name,
        codigo: categorized.codigo,
        description: categorized.description,
        price: categorized.price,
        pricePrazo: categorized.pricePrazo,
        stock: categorized.stock,
        marca: categorized.marca,
        slug: categorized.slug,
        category: categorized.category,
        imageUrl: categorized.imageUrl ?? null,
        subcategoria: subcategoriaGrupo,
        macroCategorySlug: macroSlug,
        status: 'pending_review',
        enrichmentStatus: 'done',
        reviewed_at: null,
        review_status: 'pending',
        review_notes: null,
      };

      if (draftMedia) {
        if (!setDraft.imageUrl && draftMedia.photos.length > 0) {
          setDraft.imageUrl = draftMedia.photos[0];
        }
        if (draftMedia.photos.length > 0) {
          setDraft.imageUrls = draftMedia.photos;
        }
        if (draftMedia.weight_grams != null) {
          setDraft.weight = Number((draftMedia.weight_grams / 1000).toFixed(3));
        }
        if (draftMedia.dimensions_cm) {
          setDraft.dimensionsCm = draftMedia.dimensions_cm;
        }
      }

      await col.updateOne({ _id }, { $set: setDraft });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[enrich-batch] linha:', msg);
    await col.updateOne(
      { _id },
      {
        $set: {
          enrichmentStatus: 'failed',
          enrichment_notes: `Enriquecimento: erro inesperado — ${msg.slice(0, 400)}`,
          updatedAt: new Date(),
        },
      }
    );
  }
}

/**
 * Enriquece documentos da importação rápida com o mesmo `catalog_import_batch_id`:
 * - Rascunhos `status: 'imported'` → passam a `pending_review` (fluxo de aprovação).
 * - Produtos já no catálogo (`status: true`) → mantêm-se ativos; atualiza descrição/preço/categoria via IA (sem mudar `slug`).
 */
export async function enrichImportedProductsForBatch(importId: string): Promise<void> {
  if (!importId?.trim()) {
    throw new Error('importId obrigatório');
  }

  const db = await connectToDatabase();
  const col = db.collection('products');

  const batchFilter = {
    catalog_import_batch_id: importId,
    enrichmentStatus: { $in: ['pending', 'running'] },
    $or: [{ status: 'imported' }, { status: true }],
  };

  if (!GEMINI_API_KEY) {
    console.error('[enrich-batch] GEMINI_API_KEY ausente');
    await col.updateMany(batchFilter, { $set: { enrichmentStatus: 'failed' } });
    return;
  }

  const docs = await col.find(batchFilter).limit(MAX_CATALOG_BATCH).toArray();

  for (const doc of docs) {
    await applyGeminiEnrichmentToCatalogDocument(col, doc);
  }

  if (docs.length === MAX_CATALOG_BATCH) {
    setImmediate(() => {
      enrichImportedProductsForBatch(importId).catch((e) =>
        console.error('[enrich-batch] continuação do lote:', e)
      );
    });
  }
}
