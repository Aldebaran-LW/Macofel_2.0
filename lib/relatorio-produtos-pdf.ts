/**
 * Relatório PDF "Produtos / Código de barras" (LW), ex.: `Relatorio de Produtos Codigo de Barras LW.pdf`.
 * Colunas lógicas: Código; Produto; Unid.; Cod.Barra; Peso; Custo; Venda Vista; Venda Prazo; Estoque; Status
 *
 * Diagnóstico local (sem gravar BD): `npx tsx scripts/debug-pdf-relatorio.ts "caminho/para/o.pdf"`
 */

import path from 'path';
import { pathToFileURL } from 'url';
import { importRowSlug, parseBrDecimal } from './relatorio-estoque-xls';

/** Alinhar com a versão instalada em `pdfjs-dist` (fonts/wasm via HTTPS no worker). */
const PDFJS_DIST_VER = '5.5.207';
const PDFJS_CDN_BASE = `https://unpkg.com/pdfjs-dist@${PDFJS_DIST_VER}`;

export type RelatorioProdutoPdfRow = {
  lineIndex: number;
  codigo: string;
  produto: string;
  unid: string;
  codBarra: string;
  peso: number;
  custo: number;
  vendaVista: number;
  vendaPrazo: number;
  estoque: number;
  status: string;
};

const PDF_CATEGORY = 'Importado PDF';

export function buildPdfImportDescription(r: RelatorioProdutoPdfRow): string {
  const parts = [
    `Unid.: ${r.unid}.`,
    `Peso: ${r.peso}.`,
    `Custo: ${r.custo}.`,
    `Venda prazo: ${r.vendaPrazo}.`,
    `Status: ${r.status}.`,
  ];
  if (r.codBarra) parts.unshift(`EAN: ${r.codBarra}.`);
  return parts.join(' ');
}

export function pdfRowToCatalogPrice(r: RelatorioProdutoPdfRow): number {
  return Math.max(0, r.vendaVista > 0 ? r.vendaVista : r.vendaPrazo);
}

/** pdfjs 5.x no Node exige APIs de browser para carregar o módulo (extração de texto não renderiza). */
function ensurePdfJsNodePolyfills(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      multiplySelf() {
        return this;
      }
      preMultiplySelf() {
        return this;
      }
      translateSelf() {
        return this;
      }
      scaleSelf() {
        return this;
      }
      rotateSelf() {
        return this;
      }
      invertSelf() {
        return this;
      }
    };
  }
  if (typeof g.ImageData === 'undefined') {
    g.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(sw: number, sh: number);
      constructor(data: Uint8ClampedArray, sw: number, sh?: number);
      constructor(a: number | Uint8ClampedArray, b?: number, c?: number) {
        if (a instanceof Uint8ClampedArray) {
          this.data = a;
          this.width = b ?? 0;
          this.height = c ?? 0;
        } else {
          this.width = a;
          this.height = b ?? 0;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        }
      }
    };
  }
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = class Path2D {};
  }
}

/** Agrupa itens do PDF.js por linha visual (Y) e ordena por X. */
export async function extractPdfTextLines(buffer: ArrayBuffer): Promise<string[]> {
  ensurePdfJsNodePolyfills();
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerFile = path.join(
    process.cwd(),
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.mjs'
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = pathToFileURL(workerFile).href;

  // Clonar: getDocument pode destacar o ArrayBuffer; chamadas seguintes falhariam.
  const raw = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const data = new Uint8Array(raw.byteLength);
  data.set(raw);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await (pdfjsLib as any).getDocument({
    data,
    useWorkerFetch: true,
    standardFontDataUrl: `${PDFJS_CDN_BASE}/standard_fonts/`,
    cMapUrl: `${PDFJS_CDN_BASE}/cmaps/`,
    cMapPacked: true,
    wasmUrl: `${PDFJS_CDN_BASE}/wasm/`,
  }).promise;
  const out: string[] = [];
  const maxChars = 20_000_000;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (out.join('\n').length > maxChars) break;
    // eslint-disable-next-line no-await-in-loop
    const page = await pdf.getPage(pageNum);
    // eslint-disable-next-line no-await-in-loop
    const content = await page.getTextContent();
    type Item = { str: string; transform: number[] };
    const items = (content.items as Item[])
      .filter((i) => typeof i.str === 'string' && i.str.trim())
      .map((i) => ({
        str: i.str.replace(/\u00A0/g, ' ').trim(),
        x: i.transform[4],
        y: i.transform[5],
      }));

    const bucket = new Map<number, Array<{ x: number; str: string }>>();
    const step = 3;
    for (const it of items) {
      const yk = Math.round(it.y / step) * step;
      if (!bucket.has(yk)) bucket.set(yk, []);
      bucket.get(yk)!.push({ x: it.x, str: it.str });
    }
    const ys = [...bucket.keys()].sort((a, b) => b - a);
    for (const yk of ys) {
      const row = bucket.get(yk)!;
      row.sort((a, b) => a.x - b.x);
      const line = row.map((c) => c.str).join(' ').replace(/\s+/g, ' ').trim();
      if (line) out.push(line);
    }
  }

  return out;
}

function isNoiseLine(line: string): boolean {
  const s = line.trim();
  if (!s) return true;
  if (/^RELATÓRIO\s+DE\s+PRODUTOS/i.test(s)) return true;
  // Título/capa sem número de produto no início (ex.: "Relatorio de Produtos Codigo de Barras LW")
  if (
    !/^\d/.test(s) &&
    /relat[óo]rio/i.test(s) &&
    /produtos?/i.test(s) &&
    /(c[óo]digo|cod\.?)\s*(de\s+)?barras?/i.test(s)
  ) {
    return true;
  }
  if (/^DATA:\s*\d/i.test(s)) return true;
  if (/C[oó]digo\s+Produto\s+/i.test(s) && /Status/i.test(s)) return true;
  if (/^\d+\s*Pag\.?\s*$/i.test(s)) return true;
  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(s)) return true;
  return false;
}

function cleanEan(s: string): string {
  return String(s ?? '').replace(/\D/g, '');
}

function isLikelyEan(s: string): boolean {
  const d = cleanEan(s);
  return d.length >= 8 && d.length <= 14;
}

/** Parte após ATIVO/INATIVO: Unid. Peso Estoque [EAN] Venda Vista Venda Prazo */
function parseTailTokens(toks: string[]): {
  unid: string;
  peso: number;
  estoque: number;
  codBarra: string;
  vendaVista: number;
  vendaPrazo: number;
} | null {
  if (toks.length < 4) return null;

  if (toks.length === 4) {
    const unid = toks[0];
    const peso = parseBrDecimal(toks[1]);
    const vendaVista = parseBrDecimal(toks[2]);
    const vendaPrazo = parseBrDecimal(toks[3]);
    if (!Number.isFinite(vendaVista) || !Number.isFinite(vendaPrazo)) return null;
    return {
      unid,
      peso: Number.isFinite(peso) ? peso : 0,
      estoque: 0,
      codBarra: '',
      vendaVista,
      vendaPrazo,
    };
  }

  if (toks.length === 5) {
    if (isLikelyEan(toks[2])) {
      const unid = toks[0];
      const peso = parseBrDecimal(toks[1]);
      const codBarra = cleanEan(toks[2]);
      const vendaVista = parseBrDecimal(toks[3]);
      const vendaPrazo = parseBrDecimal(toks[4]);
      if (!Number.isFinite(vendaVista) || !Number.isFinite(vendaPrazo)) return null;
      return {
        unid,
        peso: Number.isFinite(peso) ? peso : 0,
        estoque: 0,
        codBarra,
        vendaVista,
        vendaPrazo,
      };
    }
    const unid = toks[0];
    const peso = parseBrDecimal(toks[1]);
    const estoque = Math.round(parseBrDecimal(toks[2]) || 0);
    const vendaVista = parseBrDecimal(toks[3]);
    const vendaPrazo = parseBrDecimal(toks[4]);
    if (!Number.isFinite(vendaVista) || !Number.isFinite(vendaPrazo)) return null;
    return {
      unid,
      peso: Number.isFinite(peso) ? peso : 0,
      estoque,
      codBarra: '',
      vendaVista,
      vendaPrazo,
    };
  }

  if (toks.length >= 6 && isLikelyEan(toks[3])) {
    const unid = toks[0];
    const peso = parseBrDecimal(toks[1]);
    const estoque = Math.round(parseBrDecimal(toks[2]) || 0);
    const codBarra = cleanEan(toks[3]);
    const vendaVista = parseBrDecimal(toks[4]);
    const vendaPrazo = parseBrDecimal(toks[5]);
    if (!Number.isFinite(vendaVista) || !Number.isFinite(vendaPrazo)) return null;
    return {
      unid,
      peso: Number.isFinite(peso) ? peso : 0,
      estoque,
      codBarra,
      vendaVista,
      vendaPrazo,
    };
  }

  return null;
}

function parseHeadSection(head: string): { codigo: string; produto: string; custo: number } | null {
  const st = head.trim();
  const codeM = st.match(/^(\d+)\s+(.+)$/);
  if (!codeM) return null;
  const codigo = codeM[1];
  const rest = codeM[2].trim();
  const tokens = rest.split(/\s+/);
  if (tokens.length < 2) return null;
  const custo = parseBrDecimal(tokens[tokens.length - 1]);
  if (!Number.isFinite(custo)) return null;
  const produto = tokens.slice(0, -1).join(' ');
  if (!produto) return null;
  return { codigo, produto, custo };
}

/**
 * Layout comum no export LW: uma linha com … Peso Custo Venda Vista Venda Prazo Estoque ATIVO|INATIVO
 * (código no início; números finais antes do status; descrição no meio pode ter vírgulas e "1.1/4" etc.).
 */
function parseProductLineTrailingMetrics(line: string, lineIndex: number): RelatorioProdutoPdfRow | null {
  const raw = line.replace(/\u00A0/g, ' ').trim();
  if (!/^\d+\s/.test(raw)) return null;
  const st = raw.match(/\s(ATIVO|INATIVO)\s*$/i);
  if (!st || st.index === undefined) return null;
  const status = st[1].toUpperCase();
  const before = raw.slice(0, st.index).trim();
  const tokens = before.split(/\s+/).filter(Boolean);
  if (tokens.length < 7) return null;

  const nums: number[] = [];
  const rest = [...tokens];
  while (rest.length && nums.length < 5) {
    const t = rest[rest.length - 1]!;
    const n = parseBrDecimal(t);
    if (Number.isFinite(n)) {
      nums.push(n);
      rest.pop();
    } else {
      return null;
    }
  }
  if (nums.length !== 5) return null;

  const estoque = Math.round(nums[0]!);
  const vendaPrazo = nums[1]!;
  const vendaVista = nums[2]!;
  const custo = nums[3]!;
  const peso = nums[4]!;

  let codBarra = '';
  if (rest.length >= 2 && isLikelyEan(rest[rest.length - 1]!)) {
    codBarra = cleanEan(rest.pop()!);
  }

  const codigo = rest[0]!;
  if (!/^\d+$/.test(codigo)) return null;
  const produto = rest.slice(1).join(' ');
  if (!produto) return null;

  return {
    lineIndex,
    codigo,
    produto,
    unid: '',
    codBarra,
    peso,
    custo,
    vendaVista,
    vendaPrazo,
    estoque,
    status,
  };
}

function parseProductLineLegacyTabs(line: string, lineIndex: number): RelatorioProdutoPdfRow | null {
  const raw = line.replace(/\u00A0/g, ' ').trim();
  if (!/^\d+\s/.test(raw)) return null;

  const tabParts = raw.split(/\t+/).map((p) => p.trim()).filter(Boolean);
  let headForParse: string;
  let status: string;
  let tailToks: string[];

  if (tabParts.length >= 3) {
    const headTab = tabParts[0];
    const st = headTab.match(/\s(ATIVO|INATIVO)\s*$/i);
    if (!st) return null;
    status = st[1].toUpperCase();
    headForParse = headTab.slice(0, -st[0].length).trim();
    const mid = tabParts[1].split(/\s+/).filter(Boolean);
    const tailStr = tabParts.slice(2).join(' ');
    tailToks = [...mid, ...tailStr.split(/\s+/).filter(Boolean)];
  } else {
    const statusMatch = [...raw.matchAll(/\s(ATIVO|INATIVO)(?=\s|$)/gi)].pop();
    if (!statusMatch || statusMatch.index === undefined) return null;
    status = statusMatch[1].toUpperCase();
    headForParse = raw.slice(0, statusMatch.index).trim();
    const after = raw.slice(statusMatch.index + statusMatch[0].length).trim();
    tailToks = after.split(/\s+/).filter(Boolean);
  }

  const headParsed = parseHeadSection(headForParse);
  if (!headParsed) return null;

  const tail = parseTailTokens(tailToks);
  if (!tail) return null;

  return {
    lineIndex,
    codigo: headParsed.codigo,
    produto: headParsed.produto,
    unid: tail.unid,
    codBarra: tail.codBarra,
    peso: tail.peso,
    custo: headParsed.custo,
    vendaVista: tail.vendaVista,
    vendaPrazo: tail.vendaPrazo,
    estoque: tail.estoque,
    status,
  };
}

function parseProductLine(line: string, lineIndex: number): RelatorioProdutoPdfRow | null {
  return (
    parseProductLineTrailingMetrics(line, lineIndex) ?? parseProductLineLegacyTabs(line, lineIndex)
  );
}

export async function parseRelatorioProdutosPdf(buffer: ArrayBuffer): Promise<{
  rows: RelatorioProdutoPdfRow[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const lines = await extractPdfTextLines(buffer);
  const rows: RelatorioProdutoPdfRow[] = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;
    const row = parseProductLine(line, i + 1);
    if (row) {
      rows.push(row);
    } else if (/^\d+\s/.test(line) && line.length > 15) {
      skipped += 1;
    }
  }

  if (skipped > 0) {
    warnings.push(`${skipped} linha(s) com código não foram interpretadas (formato inesperado).`);
  }
  if (rows.length === 0 && lines.length > 50) {
    warnings.push(
      'Nenhum produto reconhecido. Se o PDF for digitalizado (imagem), use exportação com texto selecionável.'
    );
  }

  return { rows, warnings };
}

export function pdfRowSlug(r: RelatorioProdutoPdfRow): string {
  return importRowSlug(r.codigo, r.produto);
}

export { PDF_CATEGORY };
