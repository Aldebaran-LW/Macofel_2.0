# Importação de catálogo (Render)

Serviço **opcional** para importar Excel (`.xlsx` / `.xls`) no mesmo MongoDB do Macofel, com corpo de pedido maior do que em muitos planos serverless.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | Igual ao Macofel |
| `MONGODB_DB_NAME` | Opcional, se o URI não incluir base |
| `RENDER_CATALOG_IMPORT_SECRET` | Token longo; o mesmo valor vai em `RENDER_CATALOG_IMPORT_SECRET` no Next |
| `CORS_ORIGINS` | Opcional; origens permitidas se chamares este API a partir do browser (o fluxo recomendado é só via proxy Next) |
| `GEMINI_API_KEY` ou `GOOGLE_API_KEY` | Opcional; chave da [Google AI Studio](https://aistudio.google.com/apikey) para enriquecer nomes/descrições com Gemini quando o painel envia `enrich_ai=true` (**nunca** commits nem partilhes a chave em chat) |

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
```

Reiniciar o servidor Next. No admin **Produtos** aparece o botão **Importar (servidor dedicado)**.

## Formato do Excel

O mesmo **relatório de estoque** esperado pela importação local (`Produto`, `Grupo`, `Marca`, `Estoque`, etc.). **PDF** não é suportado aqui — use a importação normal no painel.

## Endpoint

`POST /import/catalog` — `multipart/form-data`: `file`, `upsert` (`true`/`false`), `enrich_ai` (`true`/`false`, opcional — melhora texto com Gemini se a chave estiver definida); header `Authorization: Bearer <secret>`.

`GET /` — health check; inclui `geminiEnrich: true/false` se a chave Gemini está configurada.

O painel Macofel usa o proxy `/api/admin/products/import/remote` (não exponhas o segredo no browser). Com a opção **Enriquecer com IA** ativa, o proxy usa timeout mais longo (vários lotes ao Gemini).
