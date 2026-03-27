import fs from 'fs';
import path from 'path';

/**
 * Versão usada em `?v=` do iframe `/loja/index.html` para invalidar cache CDN/browser
 * quando o bundle em `public/loja` muda (independentemente do commit do site).
 *
 * Prioridade:
 * 1. `PDV_WEB_EMBED_VERSION` (Vercel) — definir após publicar novo embed
 * 2. `public/loja/embed-version.txt` — gerado por `npm run pdv:embed`
 * 3. Hash dos nomes dos ficheiros em `index.html` (fallback)
 * 4. IDs de deploy Git / Vercel
 */
export function getPdvLojaAssetVersion(): string {
  const fromEnv = process.env.PDV_WEB_EMBED_VERSION?.trim();
  if (fromEnv) return fromEnv;

  try {
    const vPath = path.join(process.cwd(), 'public', 'loja', 'embed-version.txt');
    const t = fs.readFileSync(vPath, 'utf8').trim();
    if (t) return t;
  } catch {
    /* sem ficheiro */
  }

  const fromIndex = readChunkFingerprintFromLojaIndex();
  if (fromIndex) return fromIndex;

  return (
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim()?.slice(0, 12) ||
    ''
  );
}

function readChunkFingerprintFromLojaIndex(): string {
  try {
    const htmlPath = path.join(process.cwd(), 'public', 'loja', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const js = html.match(/\/loja\/assets\/(index-[^"'?]+\.js)/i);
    const css = html.match(/\/loja\/assets\/(index-[^"'?]+\.css)/i);
    const parts = [js?.[1], css?.[1]].filter(Boolean) as string[];
    return parts.length ? parts.join('+') : '';
  } catch {
    return '';
  }
}
