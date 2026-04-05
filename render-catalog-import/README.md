# Importação de catálogo (Render)

Serviço **opcional** para importar Excel (`.xlsx` / `.xls`) no mesmo MongoDB do Macofel, com corpo de pedido maior do que em muitos planos serverless.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | Igual ao Macofel |
| `MONGODB_DB_NAME` | Opcional, se o URI não incluir base |
| `RENDER_CATALOG_IMPORT_SECRET` | Token longo; o mesmo valor vai em `RENDER_CATALOG_IMPORT_SECRET` no Next |
| `categoryId` no `POST /import/catalog` | **Opcional.** Vazio → usa a primeira macro da vitrine na BD (mesma ordem que o site); com valor → ObjectId válido como **reserva** quando o grupo não mapeia. |
| `CORS_ORIGINS` | Opcional; origens permitidas se chamares este API a partir do browser (o fluxo recomendado é só via proxy Next) |
| `GEMINI_API_KEY` ou `GOOGLE_API_KEY` | Opcional; chave da [Google AI Studio](https://aistudio.google.com/apikey) para enriquecer nomes/descrições com Gemini quando o painel envia `enrich_ai=true` (**nunca** commits nem partilhes a chave em chat) |
| `RENDER_CATALOG_WEBHOOK_SECRET` | Opcional. Se definido, o `POST /api/import` exige o header `X-Catalog-Webhook-Secret` com o mesmo valor (configure o mesmo no Next em `RENDER_CATALOG_WEBHOOK_SECRET`). |
| `MAX_CATALOG_BATCH` | Opcional; 1–100, default `50` — máximo de linhas gravadas como `pending_review` por pedido `/api/import`. |

## Deploy (Render)

Na **raiz** do repositório Macofel, o `render.yaml` define **só** este importador (`macofel-catalog-import`). O site Next.js fica na **Vercel** — não uses a raiz do repo como Web Service Node na Render (isso corre `next build` e falha ou duplica o deploy). Na dashboard podes aplicar o blueprint ou criar manualmente:

1. **Web Service** com **Root Directory**: `render-catalog-import`.
2. Comando: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Build: `pip install -r requirements.txt`
4. Copiar a URL pública (ex.: `https://macofel-catalog-import.onrender.com`).

## Macofel (Next.js)

No `.env` do Macofel:

```env
RENDER_CATALOG_IMPORT_URL=https://SEU-SERVICO.onrender.com
RENDER_CATALOG_IMPORT_SECRET=o_mesmo_token
# Fluxo Blob → agente (upload no painel «Importar com agente»):
RENDER_CATALOG_AGENT_URL=https://SEU-SERVICO.onrender.com/api/import
# Opcional, mas recomendado em produção (igual ao Render):
RENDER_CATALOG_WEBHOOK_SECRET=um_segredo_longo
```

Reiniciar o servidor Next. No admin **Produtos** aparece o botão **Importar (servidor dedicado)**.

## Formato do Excel

O mesmo **relatório de estoque** esperado pela importação local (`Produto`, `Grupo`, `Marca`, `Estoque`, etc.). **PDF** não é suportado aqui — use a importação normal no painel.

## Endpoints

### `POST /api/import` (JSON — chamado pelo Next após Vercel Blob)

- **Content-Type:** `application/json`
- **Corpo (contrato Macofel Next.js):**

```json
{
  "fileUrl": "https://blob.vercel-storage.com/...",
  "fileName": "Relatorio.xls",
  "importType": "full-catalog",
  "userId": "opcional-id-postgres",
  "blobReadToken": "opcional — Bearer para Blob privado"
}
```

- Se `RENDER_CATALOG_WEBHOOK_SECRET` estiver definido no Render, enviar header **`X-Catalog-Webhook-Secret`** com o mesmo valor.
- Resposta de sucesso (exemplo): `status`, `importId`, `message`, `processed`, `pending_review`, `warnings`.
- **Formato:** apenas `.xls` / `.xlsx` (relatório LW). Grava em MongoDB `products` com `status: "pending_review"` para aprovação no Master.
- Com `GEMINI_API_KEY` e `importType: full-catalog`, aplica enriquecimento Gemini antes de gravar.

### `POST /import/catalog` (multipart — painel «servidor dedicado»)

`multipart/form-data`: `file`, `upsert`, `enrich_ai`, `categoryId`, `preserve_stock_db`; header `Authorization: Bearer <RENDER_CATALOG_IMPORT_SECRET>`.

`GET /` — health check; inclui `geminiEnrich: true/false` se a chave Gemini está configurada.

O painel Macofel usa o proxy `/api/admin/products/import/remote` (não exponhas o segredo no browser). Com a opção **Enriquecer com IA** ativa, o proxy usa timeout mais longo (vários lotes ao Gemini).
