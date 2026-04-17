# 📦 Onde o Catálogo Está Armazenado?

## 🗄️ Localização: Banco de Dados Supabase (PostgreSQL)

O catálogo de produtos está armazenado no **banco de dados PostgreSQL do Supabase**.

### 📊 Estrutura do Banco

### Tabela: `products`
Armazena todos os produtos do catálogo.

**Campos:**
- `id` - Identificador único
- `name` - Nome do produto
- `slug` - URL amigável (ex: `cimento-cp2-50kg`)
- `description` - Descrição do produto
- `price` - Preço (Float)
- `stock` - Quantidade em estoque
- `imageUrl` - URL da imagem do produto
- `categoryId` - ID da categoria
- `featured` - Se está em destaque (boolean)
- `createdAt` - Data de criação
- `updatedAt` - Data de atualização

### Tabela: `categories`
Armazena as categorias dos produtos.

**Campos:**
- `id` - Identificador único
- `name` - Nome da categoria
- `slug` - URL amigável (ex: `cimento-argamassa`)
- `description` - Descrição da categoria

## 🔍 Como Acessar os Dados

### 1. Via Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. Vá em **Table Editor**
4. Selecione a tabela `products` ou `categories`

### 2. Via Prisma Studio (Local)

```powershell
cd nextjs_space
npx prisma studio
```

Acesse: http://localhost:5555

### 3. Via SQL Editor (Supabase)

1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. Vá em **SQL Editor**
4. Execute queries SQL:

```sql
-- Ver todos os produtos
SELECT * FROM products;

-- Ver produtos com categorias
SELECT p.*, c.name as category_name 
FROM products p 
JOIN categories c ON p."categoryId" = c.id;

-- Contar produtos
SELECT COUNT(*) FROM products;

-- Ver categorias
SELECT * FROM categories;
```

### 4. Via API

Os produtos são acessados através da API:

- **Listar produtos:** `GET /api/products`
- **Produto por slug:** `GET /api/products/[slug]]`
- **Listar categorias:** `GET /api/categories`

## 📝 Dados Iniciais (Seed)

Os dados iniciais estão definidos em:
- **Arquivo:** `scripts/seed.ts`
- **Conteúdo:** 21 produtos em 6 categorias

### Para popular o banco:

```powershell
cd nextjs_space
npx prisma db seed
```

## 🔄 Como os Dados São Buscados

1. **Frontend** (`/catalogo`) faz requisição para `/api/products`
2. **API** (`app/api/products/route.ts`) usa Prisma para buscar no banco
3. **Prisma** conecta ao Supabase PostgreSQL via `DATABASE_URL`
4. **Dados retornados** em JSON para o frontend

## 📍 Resumo

- **Banco:** Supabase PostgreSQL
- **Tabela:** `products` e `categories`
- **Acesso:** Via Prisma ORM
- **API:** `/api/products` e `/api/categories`
- **Dados iniciais:** `scripts/seed.ts`

---

**O catálogo está no banco de dados Supabase PostgreSQL!**
