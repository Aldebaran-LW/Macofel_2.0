// lib/catalog-import-pipeline.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase } from './mongodb-native';
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

/** Parsers reais devolvem `{ rows, warnings }`; aqui normalizamos para linhas genéricas. */
async function loadRawRowsFromFile(file: File, fileName: string): Promise<unknown[]> {
  const n = fileName.toLowerCase();
  const ab = await file.arrayBuffer();

  if (n.endsWith('.xlsx') || n.endsWith('.xls')) {
    const { rows, warnings } = parseRelatorioEstoqueWorkbook(ab);
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

function cleanImportRow(row: Record<string, unknown>) {
  const name = String(row.name ?? row.Produto ?? '').trim();
  const pp = row.pricePrazo ?? row['Venda Prazo'];
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
  };
}

async function enrichWithGemini(product: Record<string, unknown>) {
  const prompt = `
Escreva uma descrição longa (180-280 palavras), persuasiva e otimizada para SEO para este produto de materiais de construção:

Nome: ${product.name}
Código: ${product.codigo}
Marca: ${product.marca}
Descrição original: ${product.description}

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
