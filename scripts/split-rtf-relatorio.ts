/**
 * Divide um relatório .rtf grande em vários .txt (UTF-8) para importar no admin
 * (limite de tamanho no browser / Vercel).
 *
 * Uso (na pasta do projeto):
 *   npx tsx scripts/split-rtf-relatorio.ts "E:\Relatorio Codigo de Barras.rtf" 10 "E:\"
 *
 * - partes: número de ficheiros (predefinido 10)
 * - pasta_saída: opcional; predefinido = pasta do ficheiro de entrada
 *
 * Cada parte repete o cabeçalho (linhas até «Status») + um bloco de linhas de dados no layout vertical
 * do RTF (uma linha por campo). O import no admin converte isso automaticamente para o formato tipo Excel.
 * Importe cada `*_part01.txt` … no painel (aceita .txt).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const rtf2text = require('rtf2text') as {
  string: (s: string, cb: (err: Error | null, text?: string) => void) => void;
};
const rtfToText = promisify(rtf2text.string.bind(rtf2text)) as (s: string) => Promise<string>;

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

function findHeaderLineIndex(lines: string[]): number {
  for (let i = 0; i < Math.min(300, lines.length); i++) {
    const u = lines[i].toUpperCase();
    if (u.includes('GRUPO') && u.includes('MARCA') && (u.includes('ESTOQUE') || u.includes('PRODUTO'))) {
      return i;
    }
  }
  for (let i = 0; i < Math.min(300, lines.length); i++) {
    if (/\bGrupo\b/i.test(lines[i]) && /\bMarca\b/i.test(lines[i])) return i;
  }
  return -1;
}

async function main() {
  const inputPath = process.argv[2];
  const partsArg = process.argv[3];
  const outDirArg = process.argv[4];

  if (!inputPath) {
    console.error(
      'Uso: npx tsx scripts/split-rtf-relatorio.ts "E:\\Relatorio.rtf" [partes=10] [pasta_saída]'
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

  const rawBuf = fs.readFileSync(resolvedIn);
  const text = await rtfToText(rawBuf.toString('latin1'));
  const allLines = text.split(/\r?\n/);

  const headerIdx = findHeaderLineIndex(allLines);
  const preamble = headerIdx >= 0 ? allLines.slice(0, headerIdx + 1) : [];
  const dataLines =
    headerIdx >= 0 ? allLines.slice(headerIdx + 1).filter((l) => l.trim().length > 0) : allLines.filter((l) => l.trim().length > 0);

  if (dataLines.length === 0) {
    console.error('Nenhuma linha de dados após o cabeçalho. Verifique o RTF.');
    process.exit(1);
  }

  const chunkSize = Math.ceil(dataLines.length / parts);
  const base = path.basename(resolvedIn, path.extname(resolvedIn));

  console.log('Linhas de dados:', dataLines.length, '→', parts, 'partes (~', chunkSize, 'linhas cada)');

  let written = 0;
  for (let p = 0; p < parts; p++) {
    const start = p * chunkSize;
    const chunk = dataLines.slice(start, start + chunkSize);
    if (chunk.length === 0) break;

    const outLines = [...preamble, ...chunk];
    const name = `${base}_part${String(p + 1).padStart(2, '0')}.txt`;
    const outPath = path.join(outDir, name);
    fs.writeFileSync(outPath, '\uFEFF' + outLines.join('\r\n'), 'utf8');
    console.log(outPath, '→', outLines.length, 'linhas');
    written += 1;
  }

  console.log('Concluído:', written, 'ficheiro(s) em', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
