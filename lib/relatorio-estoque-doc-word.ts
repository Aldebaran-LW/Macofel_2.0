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
import { parseRelatorioEstoqueFromSheetRows } from '@/lib/relatorio-estoque-xls';

const require = createRequire(import.meta.url);
const rtf2text = require('rtf2text') as {
  string: (s: string, cb: (err: Error | null, text?: string) => void) => void;
};
const rtfToText = promisify(rtf2text.string.bind(rtf2text)) as (s: string) => Promise<string>;

export type WordLikeSource = 'docx' | 'doc' | 'rtf';

export function isWordLikeCatalogFile(name: string, mime: string): boolean {
  const n = name.toLowerCase();
  const t = (mime || '').toLowerCase();
  return (
    n.endsWith('.docx') ||
    n.endsWith('.doc') ||
    n.endsWith('.rtf') ||
    t === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    t === 'application/msword' ||
    t === 'application/rtf' ||
    t === 'text/rtf'
  );
}

function wordLikeSourceFromName(name: string): WordLikeSource | null {
  const n = name.toLowerCase();
  if (n.endsWith('.docx')) return 'docx';
  if (n.endsWith('.doc')) return 'doc';
  if (n.endsWith('.rtf')) return 'rtf';
  return null;
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

async function matricesFromRtf(buffer: ArrayBuffer): Promise<string[][][]> {
  const raw = Buffer.from(buffer).toString('latin1');
  const text = await rtfToText(raw);
  const m = plainTextToMatrix(text);
  return m.length ? [m] : [];
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
    throw new Error('Extensão não suportada para Word/RTF (.docx, .doc, .rtf)');
  }

  let matrices: string[][][] = [];
  const warnings: string[] = [];

  if (source === 'docx') {
    const r = await matricesFromDocx(buffer);
    matrices = r.matrices;
    warnings.push(...r.warnings);
  } else if (source === 'doc') {
    matrices = await matricesFromDoc(buffer);
  } else {
    matrices = await matricesFromRtf(buffer);
  }

  const base = path.basename(fileName, path.extname(fileName)) || 'documento';
  const out: RelatorioEstoqueRow[] = [];

  if (matrices.length === 0) {
    warnings.push('Nenhuma tabela ou linha de texto reconhecida no ficheiro.');
    return { rows: out, warnings, source };
  }

  for (let i = 0; i < matrices.length; i++) {
    const sheetName = matrices.length > 1 ? `${base} — tabela ${i + 1}` : base;
    const { rows: part, warnings: w } = parseRelatorioEstoqueFromSheetRows(matrices[i], sheetName);
    out.push(...part);
    warnings.push(...w);
  }

  return { rows: out, warnings, source };
}
