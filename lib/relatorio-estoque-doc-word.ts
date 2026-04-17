/**
 * Parser de relatório «Relação de estoque» em .docx / .doc / .rtf (tabelas ou texto).
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';
import { load } from 'cheerio';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import type { RelatorioEstoqueRow } from '@/lib/relatorio-estoque-xls';
import { parseBrDecimal, parseRelatorioEstoqueFromSheetRows } from '@/lib/relatorio-estoque-xls';

const require = createRequire(import.meta.url);
const rtf2text = require('rtf2text') as {
  string: (s: string, cb: (err: Error | null, text?: string) => void) => void;
};
const rtfToText = promisify(rtf2text.string.bind(rtf2text)) as (s: string) => Promise<string>;

export type WordLikeSource = 'docx' | 'doc' | 'rtf' | 'txt';

export function isWordLikeCatalogFile(name: string, mime: string): boolean {
  const n = name.toLowerCase();
  const t = (mime || '').toLowerCase();
  return (
    n.endsWith('.docx') ||
    n.endsWith('.doc') ||
    n.endsWith('.rtf') ||
    n.endsWith('.txt') ||
    t === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    t === 'application/msword' ||
    t === 'application/rtf' ||
    t === 'text/rtf' ||
    t === 'text/plain'
  );
}

function wordLikeSourceFromName(name: string): WordLikeSource | null {
  const n = name.toLowerCase();
  if (n.endsWith('.docx')) return 'docx';
  if (n.endsWith('.doc')) return 'doc';
  if (n.endsWith('.rtf')) return 'rtf';
  if (n.endsWith('.txt')) return 'txt';
  return null;
}

/** Cabeçalho sintético igual ao Excel «relação de estoque» (2× Produto + Grupo/Marca + valores). */
const SYNTH_XLS_HEADER_ROW = [
  'Produto',
  'Produto',
  'Grupo',
  'Marca',
  'Estoque',
  'Vl.Est.Custo',
  'Vl.Est.Venda',
  'Vl.Est.Venda Prazo',
];

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

function normLine(s: string): string {
  return stripBom(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * No TXT vertical (Relatório de Produtos), linha em branco = coluna sem dado.
 * Gravamos «—» no ficheiro para ficar visível; na importação trata-se como célula vazia
 * (números → NaN, não confundir com zero).
 */
export const IMPORT_EMPTY_VERTICAL_CELL = '—';

function normalizeLwVerticalSlot(s: string): string {
  const t = stripBom(s).trim();
  if (
    t === '' ||
    t === IMPORT_EMPTY_VERTICAL_CELL ||
    t === '-' ||
    /^n\/?d$/iu.test(t) ||
    /^\(vazio\)$/iu.test(t)
  ) {
    return '';
  }
  return t;
}

/**
 * RTF «Relatório de Produtos» exportado em texto: cada campo numa linha (Código, Produto, …, Status),
 * não uma linha por produto como no Excel.
 */
export function isVerticalRelatorioProdutosTxt(text: string): boolean {
  const raw = stripBom(text);
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 15) return false;
  const head = lines.slice(0, 40).map(normLine);
  const joined = head.join('\n');
  if (!joined.includes('relatorio de produtos')) return false;
  if (!head.some((l) => l === 'codigo')) return false;
  if (!head.some((l) => l === 'produto')) return false;
  if (!head.some((l) => l.includes('venda vista'))) return false;
  if (!head.some((l) => l.includes('estoque'))) return false;
  if (!head.some((l) => l === 'status')) return false;
  return true;
}

function isLikelyVerticalProductCode(line: string): boolean {
  const t = stripBom(line).trim();
  if (!/^\d{3,9}$/.test(t)) return false;
  return parseInt(t, 10) >= 100;
}

function isVerticalStatusLine(line: string): boolean {
  const u = normLine(line);
  return u === 'ativo' || u === 'inativo';
}

/**
 * Mapeia linhas entre nome e status para Estoque / custo / venda, conforme colunas LW:
 * Unid., Cod.Barra, Peso, Custo, Venda Vista, Venda Prazo, Estoque (último).
 * O .txt vertical compacta zeros: p.ex. 16283 fica 0,0,0,9,0,13 → alinhado à direita como
 * Peso=0, Custo=0, V.Vista=0,9, V.Prazo=0 (não confundir com “só peso”).
 */
export function mapVerticalLwProdutosVals(vals: string[]): {
  stock: number;
  vlCusto: number;
  vlVenda: number;
  vlVendaPrazo: number;
} {
  if (vals.length === 0) return { stock: 0, vlCusto: 0, vlVenda: 0, vlVendaPrazo: 0 };

  const slots = vals.map(normalizeLwVerticalSlot);
  const estRaw = parseBrDecimal(slots[slots.length - 1]!);
  const stock = Number.isFinite(estRaw) ? Math.round(estRaw) : 0;
  const mid = slots.slice(0, -1);
  const L = mid.length;

  let peso = 0;
  let custo = 0;
  let vv = 0;
  let vp = 0;

  const p = (i: number) => parseBrDecimal(mid[i] ?? '');

  if (L === 6) {
    peso = p(2);
    custo = p(3);
    vv = p(4);
    vp = p(5);
  } else if (L === 5) {
    peso = p(2);
    custo = p(3);
    vv = p(4);
    vp = 0;
  } else if (L === 4) {
    const m0 = (mid[0] ?? '').trim();
    const m1 = (mid[1] ?? '').trim();
    const c2 = p(2);
    const c3 = p(3);
    const d1 = p(1);

    /**
     * Dois zeros iniciais = Peso 0 + Custo 0; as duas células seguintes são **Venda Vista** e **Venda Prazo**
     * (não custo+vista). O ramo antigo (c2≥5, c3≥5) punha o preço a prazo na «vista» na prévia.
     * Vista→Prazo no LW costuma subir poucos %; Custo→Vista salta muito mais — usamos isso para distinguir
     * de [0,0,custo,vista] quando o prazo não veio na exportação.
     */
    const relSpread = c2 > 1e-9 ? (c3 - c2) / c2 : 1;
    if (m0 === '0' && m1 === '0' && c2 > 0 && c3 > 0 && c3 >= c2 && relSpread <= 0.22) {
      peso = 0;
      custo = 0;
      vv = c2;
      vp = c3;
    } else if (m0 === '0' && m1 === '0' && c2 > 0 && c3 > 0 && relSpread > 0.22) {
      peso = 0;
      custo = c2;
      vv = c3;
      vp = 0;
    } else if (m0 === '0' && m1 !== '0') {
      /**
       * Quatro células [0, a, b, c]: ou (peso, custo, vista, prazo com peso>0) ou **peso 0 + custo + vista + prazo**
       * quando Unid./Barra/Peso colapsam — ex. 16322: 0, 27,77, 40,9, 42,79 antes do estoque.
       * O limite CUSTO_FIRST_MAX fazia a>25 ser tratado como «peso», metendo o preço a prazo na coluna vista e vp=0.
       */
      const CUSTO_FIRST_MAX = 25;
      const relVP =
        c2 > 1e-9 && Number.isFinite(c3) && c3 >= c2 ? (c3 - c2) / c2 : 1;
      const semPrazo = !Number.isFinite(c3) || c3 <= 1e-9;
      const parVistaPrazoLw =
        Number.isFinite(c3) && c3 > 0 && c2 > 0 && c3 >= c2 && relVP <= 0.22;
      const pareceCustoVistaPrazo =
        d1 > 0 && c2 > 0 && d1 < c2 && (semPrazo || parVistaPrazoLw);

      if (pareceCustoVistaPrazo) {
        peso = 0;
        custo = d1;
        vv = c2;
        vp = semPrazo ? 0 : c3;
      } else if (d1 < CUSTO_FIRST_MAX) {
        peso = 0;
        custo = d1;
        vv = c2;
        vp = c3;
      } else {
        peso = d1;
        custo = c2;
        vv = c3;
        vp = 0;
      }
    } else {
      peso = p(0);
      custo = p(1);
      vv = p(2);
      vp = p(3);
    }
  } else if (L > 0 && L < 4) {
    const slotNums = [0, 0, 0, 0, 0, 0];
    for (let j = 0; j < L; j++) {
      slotNums[6 - L + j] = p(j);
    }
    peso = slotNums[2];
    custo = slotNums[3];
    vv = slotNums[4];
    vp = slotNums[5];
  } else if (L > 6) {
    const tail = mid.slice(-6);
    peso = parseBrDecimal(tail[2]!);
    custo = parseBrDecimal(tail[3]!);
    vv = parseBrDecimal(tail[4]!);
    vp = parseBrDecimal(tail[5]!);
  } else {
    const v = [...mid];
    vp = v.length >= 1 ? parseBrDecimal(v.pop()!) : NaN;
    vv = v.length >= 1 ? parseBrDecimal(v.pop()!) : NaN;
    custo = v.length >= 1 ? parseBrDecimal(v.pop()!) : NaN;
    peso = v.length >= 1 ? parseBrDecimal(v.pop()!) : NaN;
  }

  void peso;
  const vlCusto = Number.isFinite(custo) && custo >= 0 ? custo : 0;
  const vlVenda = Number.isFinite(vv) && vv > 0 ? vv : 0;
  const vlVendaPrazo = Number.isFinite(vp) && vp > 0 ? vp : 0;
  return { stock, vlCusto, vlVenda, vlVendaPrazo };
}

/**
 * Converte texto vertical (código → nome → valores até ATIVO/INATIVO) numa matriz 1 linha cabeçalho + N linhas dados.
 */
export function verticalRelatorioProdutosTxtToMatrix(text: string): string[][] {
  /** Manter linhas vazias: cada linha = uma coluna no RTF vertical (~10 campos + status). */
  const lines = stripBom(text).split(/\r?\n/).map((l) => l.trim());

  let dataStart = -1;
  for (let i = 1; i < lines.length; i++) {
    if (normLine(lines[i]) !== 'status') continue;
    for (let k = i - 1; k >= Math.max(0, i - 8); k--) {
      const nk = normLine(lines[k]);
      if (nk && nk.includes('estoque')) {
        dataStart = i + 1;
        break;
      }
    }
    if (dataStart >= 0) break;
  }
  if (dataStart < 0) return [];

  const out: string[][] = [SYNTH_XLS_HEADER_ROW];
  let i = dataStart;

  while (i < lines.length) {
    if (!isLikelyVerticalProductCode(lines[i])) {
      i += 1;
      continue;
    }
    const code = stripBom(lines[i]).trim();
    i += 1;
    if (i >= lines.length) break;
    const name = stripBom(lines[i]).trim();
    i += 1;
    if (!name) continue;

    const vals: string[] = [];
    while (i < lines.length && !isVerticalStatusLine(lines[i])) {
      const cell = stripBom(lines[i]).trim();
      vals.push(cell === '' ? IMPORT_EMPTY_VERTICAL_CELL : cell);
      i += 1;
    }
    if (i >= lines.length) break;
    i += 1;

    if (vals.length === 0) continue;

    const { stock, vlCusto, vlVenda, vlVendaPrazo } = mapVerticalLwProdutosVals(vals);

    const br = (n: number) =>
      Number.isFinite(n) ? String(n).replace(/\./g, ',') : '0';

    out.push([code, name, 'Sem grupo', '—', br(stock), br(vlCusto), br(vlVenda), br(vlVendaPrazo)]);
  }

  return out.length > 1 ? out : [];
}

/** Linhas do documento → células (tab ou vários espaços). */
export function plainTextToMatrix(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => {
      if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
      const parts = line
        .split(/\s{2,}/u)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      return parts.length ? parts : [line];
    });
}

function htmlTablesToMatrices(html: string): string[][][] {
  const $ = load(html);
  const tables: string[][][] = [];
  $('table').each((_, el) => {
    const rows: string[][] = [];
    $(el)
      .find('tr')
      .each((__, tr) => {
        const cells: string[] = [];
        $(tr)
          .find('th, td')
          .each((___, cell) => {
            cells.push($(cell).text().replace(/\s+/gu, ' ').trim());
          });
        if (cells.length) rows.push(cells);
      });
    if (rows.length) tables.push(rows);
  });
  return tables;
}

async function matricesFromDocx(buffer: ArrayBuffer): Promise<{ matrices: string[][][]; warnings: string[] }> {
  const warnings: string[] = [];
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
  for (const m of htmlResult.messages ?? []) {
    if (m.type === 'error') warnings.push(m.message);
  }
  const fromHtml = htmlTablesToMatrices(htmlResult.value);
  if (fromHtml.length > 0) return { matrices: fromHtml, warnings };

  const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
  for (const m of textResult.messages ?? []) {
    if (m.type === 'error') warnings.push(m.message);
  }
  const m = plainTextToMatrix(textResult.value);
  return { matrices: m.length ? [m] : [], warnings };
}

async function matricesFromDoc(buffer: ArrayBuffer): Promise<string[][][]> {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(Buffer.from(buffer));
  const body = doc.getBody();
  const m = plainTextToMatrix(body);
  return m.length ? [m] : [];
}

async function matricesFromRtf(
  buffer: ArrayBuffer
): Promise<{ matrices: string[][][]; lwVendaVistaUnit: boolean }> {
  const raw = Buffer.from(buffer).toString('latin1');
  const text = await rtfToText(raw);
  if (isVerticalRelatorioProdutosTxt(text)) {
    const m = verticalRelatorioProdutosTxtToMatrix(text);
    return { matrices: m.length ? [m] : [], lwVendaVistaUnit: true };
  }
  const m = plainTextToMatrix(text);
  return { matrices: m.length ? [m] : [], lwVendaVistaUnit: false };
}

function matricesFromTxt(buffer: ArrayBuffer): { matrices: string[][][]; lwVendaVistaUnit: boolean } {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(Buffer.from(buffer));
  if (isVerticalRelatorioProdutosTxt(text)) {
    const m = verticalRelatorioProdutosTxtToMatrix(text);
    return { matrices: m.length ? [m] : [], lwVendaVistaUnit: true };
  }
  const m = plainTextToMatrix(text);
  return { matrices: m.length ? [m] : [], lwVendaVistaUnit: false };
}

/**
 * Agrega linhas de todas as tabelas/matrizes que tenham o cabeçalho esperado.
 */
export async function parseRelatorioEstoqueWordLike(
  buffer: ArrayBuffer,
  fileName: string
): Promise<{ rows: RelatorioEstoqueRow[]; warnings: string[]; source: WordLikeSource }> {
  const source = wordLikeSourceFromName(fileName);
  if (!source) {
    throw new Error('Extensão não suportada para Word/RTF (.docx, .doc, .rtf, .txt)');
  }

  let matrices: string[][][] = [];
  let lwVendaVistaUnit = false;
  const warnings: string[] = [];

  if (source === 'docx') {
    const r = await matricesFromDocx(buffer);
    matrices = r.matrices;
    warnings.push(...r.warnings);
  } else if (source === 'doc') {
    matrices = await matricesFromDoc(buffer);
  } else if (source === 'txt') {
    const tx = matricesFromTxt(buffer);
    matrices = tx.matrices;
    lwVendaVistaUnit = tx.lwVendaVistaUnit;
  } else {
    const rtf = await matricesFromRtf(buffer);
    matrices = rtf.matrices;
    lwVendaVistaUnit = rtf.lwVendaVistaUnit;
  }

  const base = path.basename(fileName, path.extname(fileName)) || 'documento';
  const out: RelatorioEstoqueRow[] = [];

  if (matrices.length === 0) {
    warnings.push('Nenhuma tabela ou linha de texto reconhecida no ficheiro.');
    return { rows: out, warnings, source };
  }

  for (let i = 0; i < matrices.length; i++) {
    const sheetName = matrices.length > 1 ? `${base} — tabela ${i + 1}` : base;
    const { rows: part, warnings: w } = parseRelatorioEstoqueFromSheetRows(
      matrices[i],
      sheetName,
      lwVendaVistaUnit ? { vendaVistaIsUnitPrice: true } : undefined
    );
    out.push(...part);
    warnings.push(...w);
  }

  return { rows: out, warnings, source };
}
