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
const pdvRoot = path.join(macofelRoot, '..', 'PDV-Macofel');
const dist = path.join(pdvRoot, 'dist');
const target = path.join(macofelRoot, 'public', 'loja');

if (!fs.existsSync(path.join(pdvRoot, 'package.json'))) {
  console.error('PDV-Macofel não encontrado em:', pdvRoot);
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
console.log('PDV embed copiado para public/loja');
