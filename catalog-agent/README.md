# Agente de catálogo — Macofel

Agente com **LangGraph** + **Gemini** para importar, enriquecer e enfileirar itens para revisão antes de irem ao catálogo oficial.

## Funcionalidades (roadmap / parcial)

- Importação a partir de JSON (Excel/PDF/TXT podem ser convertidos para JSON em etapa anterior)
- Enriquecimento com IA (descrições longas para SEO, no nó `enrich`)
- Categorização (stub no nó `categorize`; substituir por regras ou LLM)
- Documentos gravados com `status: pending_review` numa **fila MongoDB** dedicada
- O catálogo público (`products` no Prisma) tem schema próprio; a fila evita misturar documentos incompatíveis

## Requisitos

- Python 3.10+
- Variáveis no `.env` na raiz do projeto ou em `catalog-agent/.env` (o `load_dotenv()` procura a partir do cwd):

  - `GEMINI_API_KEY` ou `GOOGLE_API_KEY` (LangChain Google GenAI)
  - `MONGODB_URI`
  - Opcional: `MONGODB_DB_NAME` se a URI não definir database padrão
  - Opcional: `MONGODB_CATALOG_QUEUE_COLLECTION` (padrão: `catalog_agent_pending_review`)

## Instalação

```bash
cd catalog-agent
pip install -r requirements.txt
```

## Uso

1. Crie `catalog-agent/data/import_products.json` com uma lista de objetos (campos usados no prompt: `name`, `codigo`, `description`, `price`, `category`, `marca`, etc.).
2. **Opcional — `web_title`:** se o pipeline TypeScript (ou outro passo) já tiver o título validado na web (ex.: ML/Google por EAN), inclua `"web_title": "..."` no objeto. O enriquecedor compara com o nome interno; se for incompatível, **não** gera descrição nem grava `pending_review` para esse item. Na importação **rápida** do catálogo (Next → `saveProductsForReviewFast`), o campo `web_title` é preenchido automaticamente por EAN quando as APIs estão configuradas, ou pode vir do ficheiro se a coluna existir no relatório.
3. **Memória de colunas (relatórios):** no app Next, importações de **estoque** CSV/XLSX usam a coleção Mongo `import_patterns` (fingerprint + `mapping`). O agente Python aqui consome **JSON** já normalizado — o mapeamento de colunas cruas é responsabilidade da etapa anterior.
4. Execute:

```bash
cd catalog-agent
python main.py
```

Ou passe o caminho do arquivo:

```bash
python main.py caminho/para/arquivo.json
```

O processamento respeita `MAX_PRODUCTS_PER_BATCH` em `config/settings.py`.

## Painel admin

A URL de produção pode ser algo como `https://www.macofelparapua.com/admin/master/`.  
É necessário **criar uma página de revisão** no Next.js que chame funções equivalentes a `get_pending_review_products`, `approve_product` e `reject_product` (ou APIs que usem a mesma coleção `MONGODB_CATALOG_QUEUE_COLLECTION`).

## Estrutura

- `agents/` — nós do grafo (enricher, categorizer stub)
- `graphs/catalog_pipeline.py` — workflow; `catalog_pipeline` é alias de `catalog_graph`
- `tools/mongodb_tools.py` — leitura/escrita na fila de revisão
- `main.py` — entrada CLI
