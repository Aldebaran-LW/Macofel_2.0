/**
 * Testa ligações PDV ↔ Macofel em produção (ou BASE_URL via arg).
 * Lê MACOFEL_API_KEY do .env do PDV-Macofel (irmão desta pasta), sem imprimir a chave.
 * Uso: node scripts/test-pdv-connections.mjs
 *      node scripts/test-pdv-connections.mjs https://www.macofelparapua.com
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const macofelRoot = join(__dirname, '..');
const pdvEnv = join(macofelRoot, '..', 'PDV-Macofel', '.env');

const BASE = (process.argv[2] || 'https://www.macofelparapua.com').replace(/\/$/, '');

function loadPdvKey() {
  if (!existsSync(pdvEnv)) return null;
  const text = readFileSync(pdvEnv, 'utf8');
  const m = text.match(/^MACOFEL_API_KEY=(.+)$/m);
  return m ? m[1].trim() : null;
}

function authHeaders(key) {
  return {
    Authorization: `Bearer ${key}`,
    'X-API-Key': key,
    Accept: 'application/json',
  };
}

async function main() {
  const key = loadPdvKey();
  const results = [];

  const push = (name, ok, detail) => results.push({ name, ok, detail });

  // 1) Catálogo sem credenciais → deve bloquear (403) em produção com guard ativo
  try {
    const r = await fetch(`${BASE}/api/products?page=1&limit=1`);
    const body = await r.text();
    const json = body.startsWith('{') ? JSON.parse(body) : {};
    const forbidden = r.status === 403 && (json.error || '').includes('autoriz');
    push(
      'GET /api/products (sem API key)',
      r.status === 403 || r.status === 401,
      `HTTP ${r.status}${forbidden ? ' — guard ativo' : ''}`
    );
  } catch (e) {
    push('GET /api/products (sem API key)', false, String(e.message));
  }

  if (!key) {
    console.log('AVISO: PDV-Macofel/.env não encontrado ou sem MACOFEL_API_KEY — testes autenticados ignorados.\n');
  } else {
    // 2) Catálogo com chave (como PDV web/Tauri)
    try {
      const r = await fetch(`${BASE}/api/products?page=1&limit=1`, { headers: authHeaders(key) });
      const j = await r.json().catch(() => ({}));
      const n = Array.isArray(j.products) ? j.products.length : -1;
      push(
        'GET /api/products?page=1&limit=1 (com API key)',
        r.ok && 'products' in j,
        r.ok ? `HTTP ${r.status}, ${n} produto(s) nesta página` : `HTTP ${r.status}`
      );
    } catch (e) {
      push('GET /api/products (com API key)', false, String(e.message));
    }

    // 3) Busca (como apiWeb buscarPorCodigoBarras fallback)
    try {
      const r = await fetch(
        `${BASE}/api/products?search=teste&limit=5`,
        { headers: authHeaders(key) }
      );
      const j = await r.json().catch(() => ({}));
      push(
        'GET /api/products?search=… (com API key)',
        r.ok && 'products' in j,
        `HTTP ${r.status}`
      );
    } catch (e) {
      push('GET /api/products?search', false, String(e.message));
    }

    // 4) Categorias
    try {
      const r = await fetch(`${BASE}/api/categories`, { headers: authHeaders(key) });
      const j = await r.json().catch(() => ({}));
      const ok = r.ok && (Array.isArray(j) || Array.isArray(j.categories));
      push('GET /api/categories (com API key)', ok, `HTTP ${r.status}`);
    } catch (e) {
      push('GET /api/categories', false, String(e.message));
    }

    // 5) OPTIONS venda PDV (CORS preflight)
    try {
      const r = await fetch(`${BASE}/api/pdv/sale`, { method: 'OPTIONS' });
      push('OPTIONS /api/pdv/sale', r.status === 204 || r.status === 200, `HTTP ${r.status}`);
    } catch (e) {
      push('OPTIONS /api/pdv/sale', false, String(e.message));
    }

    // 6) POST venda com corpo inválido → não deve ser 401 (autenticação OK)
    try {
      const r = await fetch(`${BASE}/api/pdv/sale`, {
        method: 'POST',
        headers: { ...authHeaders(key), 'Content-Type': 'application/json' },
        body: '{}',
      });
      push(
        'POST /api/pdv/sale (body inválido, chave válida)',
        r.status !== 401 && r.status !== 403,
        `HTTP ${r.status} (esperado ≠401 se PDV_API_KEY no servidor = chave local)`
      );
    } catch (e) {
      push('POST /api/pdv/sale', false, String(e.message));
    }
  }

  // Site vivo
  try {
    const r = await fetch(BASE, { redirect: 'follow' });
    push('GET / (homepage)', r.ok, `HTTP ${r.status}`);
  } catch (e) {
    push('GET / (homepage)', false, String(e.message));
  }

  console.log(`Base: ${BASE}`);
  console.log('---');
  for (const { name, ok, detail } of results) {
    console.log(`${ok ? 'OK  ' : 'FALHA'} | ${name}`);
    console.log(`      ${detail}`);
  }
  console.log('---');
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main();
