/**
 * Diagnóstico: extrai linhas do PDF e mostra amostra (sem gravar BD).
 * Uso: npx tsx scripts/debug-pdf-relatorio.ts "e:/caminho/arquivo.pdf"
 */
import fs from 'fs';
import {
  extractPdfTextLines,
  parseRelatorioProdutosPdf,
} from '../lib/relatorio-produtos-pdf';

async function main() {
  const pdfPath = process.argv[2] || 'e:/Relatorio de Produtos Codigo de Barras LW.pdf';
  const b = fs.readFileSync(pdfPath);
  const buf = new Uint8Array(b).buffer;
  const { lines, truncated } = await extractPdfTextLines(buf);
  console.log('truncated', truncated);
  console.log('totalLines', lines.length);
  const withCode = lines.filter((l) => /^\d+\s/.test(l));
  console.log('linesStartingWithDigits', withCode.length);
  const withStatus = lines.filter((l) => /\s(ATIVO|INATIVO)\b/i.test(l));
  console.log('linesWithATIVO_INATIVO', withStatus.length);
  console.log('--- first 40 raw lines ---');
  for (let i = 0; i < Math.min(40, lines.length); i++) {
    console.log(i + 1, JSON.stringify(lines[i].slice(0, 200)));
  }
  const parsed = await parseRelatorioProdutosPdf(new Uint8Array(fs.readFileSync(pdfPath)).buffer);
  console.log('--- parse ---');
  console.log('rows', parsed.rows.length);
  console.log('warnings', parsed.warnings);
  if (parsed.rows[0]) console.log('firstRow', parsed.rows[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
