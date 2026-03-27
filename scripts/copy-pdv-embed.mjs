/**
 * Executa `npm run build:embed` no repositório PDV-Macofel (irmão desta pasta)
 * e copia o dist para public/loja.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const macofelRoot = path.join(__dirname, '..');
const pdvRoot = process.env.PDV_MACOFEL_ROOT?.trim()
  ? path.resolve(process.env.PDV_MACOFEL_ROOT.trim())
  : path.join(macofelRoot, '..', 'PDV-Macofel');
const dist = path.join(pdvRoot, 'dist');
const target = path.join(macofelRoot, 'public', 'loja');

if (!fs.existsSync(path.join(pdvRoot, 'package.json'))) {
  console.error('PDV-Macofel não encontrado em:', pdvRoot);
  console.error('Clone o repo ou defina PDV_MACOFEL_ROOT com caminho absoluto.');
  process.exit(1);
}

execSync('npm run build:embed', { cwd: pdvRoot, stdio: 'inherit' });

function copyRecursive(src, dest) {
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
copyRecursive(dist, target);

let embedLabel = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(pdvRoot, 'package.json'), 'utf8'));
  if (pkg?.version) embedLabel = `${pkg.version}+${embedLabel}`;
} catch {
  /* ignore */
}
const indexPath = path.join(target, 'index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const m = html.match(/(index-[a-zA-Z0-9_-]+\.js)/i);
  if (m) embedLabel = `${embedLabel}:${m[1]}`;
}
fs.writeFileSync(path.join(target, 'embed-version.txt'), `${embedLabel}\n`, 'utf8');
console.log('PDV embed copiado para public/loja (embed-version.txt atualizado)');
