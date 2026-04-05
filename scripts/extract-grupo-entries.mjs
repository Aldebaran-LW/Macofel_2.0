import fs from 'fs';
import path from 'path';

const s = fs.readFileSync('lib/grupo-macro-categoria.ts', 'utf8');
const letterToSlug = {
  H: 'material-hidraulico',
  E: 'material-eletrico',
  T: 'tintas-acessorios',
  F: 'ferramentas',
  C: 'cimento-argamassa',
  B: 'tijolos-blocos',
};
const re = /\['((?:\\.|[^'\\])*)',\s*([HETFCB])\]/g;
const out = [];
let m;
while ((m = re.exec(s)) !== null) {
  const label = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  out.push([label, letterToSlug[m[2]]]);
}
const dest = process.argv[2] || 'render-catalog-import/grupo_entries.json';
fs.writeFileSync(dest, JSON.stringify(out));
console.log(
  `OK: ${out.length} grupos → ${path.resolve(dest)}`
);
