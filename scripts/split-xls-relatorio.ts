/**
 * Divide um relatório .xls/.xlsx grande em vários .xlsx (cabeçalho repetido + blocos de linhas)
 * para importar no admin com limite de tamanho (browser / Vercel).
 *
 * Uso (na pasta do projeto):
 *   npx tsx scripts/split-xls-relatorio.ts "E:\Relatorio de Produtos Codigo de Barras.xls" 10 "E:\Produtos exel"
 *
 * - partes: número de ficheiros (predefinido 10)
 * - pasta_saída: opcional; predefinido = pasta do ficheiro de entrada
 *
 * Usa a primeira folha com cabeçalho «Relação de estoque» (Produto, Grupo, Marca, Estoque…),
 * igual ao import do painel. Importe cada `*_part01.xlsx` … em sequência (upsert).
 *
 * Saída em .xlsx (mesmo com entrada .xls). Se o .xls falhar no SheetJS, tenta-se:
 * 1) LibreOffice em modo headless (`soffice --convert-to xlsx`), se existir;
 * 2) Microsoft Excel (COM via PowerShell) — só Windows;
 * 3) Microsoft Excel (COM via cscript + VBScript) — só Windows.
 * Lógica partilhada: `lib/xls-legacy-convert.ts` (também usada pela API de import).
 *
 * Variáveis de ambiente opcionais (LibreOffice fora de Program Files):
 * - MACOFEL_SOFFICE — caminho completo de soffice.exe ou soffice.com
 * - MACOFEL_LIBREOFFICE_HOME — pasta raiz com subpastas program, share, help…
 */
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { findRelatorioEstoqueHeaderRowIndex } from '../lib/relatorio-estoque-xls';
import { readWorkbookFromLegacyXlsPath } from '../lib/xls-legacy-convert';

function rowAsArray(row: unknown): string[] {
  if (!row || !Array.isArray(row)) return [];
  return row.map((c) => String(c ?? '').trim());
}

/** Em Windows, `mkdir` na raiz da unidade (ex.: `E:\`) dá EPERM — a pasta já “existe”. */
function ensureOutputDir(dir: string): void {
  const resolved = path.resolve(dir);
  if (process.platform === 'win32') {
    const norm = resolved.replace(/\\/g, '/');
    if (/^[a-zA-Z]:\/?$/i.test(norm)) return;
  }
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
}

function pickSheetWithHeader(wb: XLSX.WorkBook): {
  sheetName: string;
  rows: string[][];
  headerIdx: number;
} | null {
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
    const rows = matrix.map((r) => rowAsArray(r));
    const headerIdx = findRelatorioEstoqueHeaderRowIndex(rows);
    if (headerIdx >= 0) return { sheetName, rows, headerIdx };
  }
  return null;
}

function main() {
  const inputPath = process.argv[2];
  const partsArg = process.argv[3];
  const outDirArg = process.argv[4];

  if (!inputPath) {
    console.error(
      'Uso: npx tsx scripts/split-xls-relatorio.ts "E:\\Relatorio.xls" [partes=10] [pasta_saída]'
    );
    process.exit(1);
  }

  const resolvedIn = path.resolve(inputPath);
  if (!fs.existsSync(resolvedIn)) {
    console.error('Ficheiro não encontrado:', resolvedIn);
    process.exit(1);
  }

  const parts = Math.max(2, Math.min(100, parseInt(partsArg || '10', 10) || 10));
  const outDir = outDirArg ? path.resolve(outDirArg) : path.dirname(resolvedIn);
  ensureOutputDir(outDir);

  let wb: XLSX.WorkBook;
  try {
    wb = readWorkbookFromLegacyXlsPath(resolvedIn);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
  const picked = pickSheetWithHeader(wb);
  if (!picked) {
    console.error('Nenhuma folha com cabeçalho esperado (Produto, Grupo, Marca, Estoque).');
    process.exit(1);
  }

  const { sheetName, rows, headerIdx } = picked;
  const preamble = rows.slice(0, headerIdx + 1);
  const dataRows = rows.slice(headerIdx + 1).filter((r) => r.some((c) => String(c ?? '').trim()));

  if (dataRows.length === 0) {
    console.error('Nenhuma linha de dados após o cabeçalho na folha:', sheetName);
    process.exit(1);
  }

  const chunkSize = Math.ceil(dataRows.length / parts);
  const base = path.basename(resolvedIn, path.extname(resolvedIn));
  const safeSheet = sheetName.slice(0, 31) || 'Dados';

  console.log(
    'Folha:',
    sheetName,
    '| Linhas de dados:',
    dataRows.length,
    '→',
    parts,
    'partes (~',
    chunkSize,
    'linhas cada)'
  );

  let written = 0;
  for (let p = 0; p < parts; p++) {
    const start = p * chunkSize;
    const chunk = dataRows.slice(start, start + chunkSize);
    if (chunk.length === 0) break;

    const aoa = [...preamble, ...chunk];
    const newSheet = XLSX.utils.aoa_to_sheet(aoa);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newSheet, safeSheet);
    const name = `${base}_part${String(p + 1).padStart(2, '0')}.xlsx`;
    const outPath = path.join(outDir, name);
    XLSX.writeFile(newWb, outPath, { bookType: 'xlsx' });
    console.log(outPath, '→', aoa.length, 'linhas');
    written += 1;
  }

  console.log('Concluído:', written, 'ficheiro(s) em', outDir);
}

main();
