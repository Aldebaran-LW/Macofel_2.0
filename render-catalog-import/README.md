# Importação de catálogo (Render)

Serviço **opcional** para importar Excel (`.xlsx` / `.xls`) no mesmo MongoDB do Macofel, com corpo de pedido maior do que em muitos planos serverless.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | Igual ao Macofel |
| `MONGODB_DB_NAME` | Opcional, se o URI não incluir base |
| `RENDER_CATALOG_IMPORT_SECRET` | Token longo; o mesmo valor vai em `RENDER_CATALOG_IMPORT_SECRET` no Next |
| `CORS_ORIGINS` | Opcional; origens permitidas se chamares este API a partir do browser (o fluxo recomendado é só via proxy Next) |

## Deploy (Render)

Na raiz do repo Macofel existe `render.import.yaml` (renomeia para `render.yaml` se quiseres blueprint automático).

1. Criar **Web Service** a partir deste repositório, **Root Directory**: `render-catalog-import`.
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

`POST /import/catalog` — `multipart/form-data`: `file`, `upsert` (`true`/`false`); header `Authorization: Bearer <secret>`.

O painel Macofel usa o proxy `/api/admin/products/import/remote` (não exponhas o segredo no browser).
