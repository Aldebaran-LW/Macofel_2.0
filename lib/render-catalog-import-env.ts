/**
 * Importação de catálogo via serviço externo (ex.: FastAPI na Render).
 * Variáveis só no servidor — nunca expor o segredo ao cliente.
 */
export function getRenderCatalogImportBaseUrl(): string | null {
  const u = process.env.RENDER_CATALOG_IMPORT_URL?.trim();
  if (!u) return null;
  return u.replace(/\/$/, '');
}

export function getRenderCatalogImportSecret(): string | null {
  const s = process.env.RENDER_CATALOG_IMPORT_SECRET?.trim();
  return s || null;
}

export function isRenderCatalogImportConfigured(): boolean {
  return Boolean(getRenderCatalogImportBaseUrl() && getRenderCatalogImportSecret());
}
