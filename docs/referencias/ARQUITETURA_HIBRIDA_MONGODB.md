# 🏗️ Arquitetura Híbrida: MongoDB + Supabase

## 📋 Visão Geral

Esta arquitetura separa os dados em dois bancos:

### 🍃 MongoDB (Atlas)
- **Produtos** (`products`)
- **Categorias** (`categories`)
- **Vantagens:** Flexível, escalável, ideal para catálogo

### 🐘 Supabase (PostgreSQL)
- **Usuários** (`users`)
- **Pedidos** (`orders`)
- **Carrinhos** (`carts`)
- **Sessões** (`sessions`)
- **Vantagens:** Transacional, ACID, ideal para dados críticos

## 🚀 Passo a Passo

### 1. Configurar Schemas Prisma

Dois schemas separados foram criados:
- `prisma/schema-mongodb.prisma` - Produtos e Categorias
- `prisma/schema-postgres.prisma` - Dados burocráticos

### 2. Gerar Clientes Prisma

```bash
npm run prisma:generate
```

Isso gera dois clientes:
- `@prisma/mongodb-client` - Para MongoDB
- `@prisma/postgres-client` - Para PostgreSQL

### 3. Configurar Variáveis de Ambiente

Adicione ao `.env`:

```env
# MongoDB (Produtos)
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority"

# Supabase (Dados Burocráticos)
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Outras variáveis...
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

### 4. Migrar Dados para MongoDB

```bash
npm run prisma:migrate
```

Este script:
- Lê produtos e categorias do Supabase
- Migra para MongoDB
- Mantém IDs e relacionamentos

### 5. Atualizar APIs

As APIs de produtos devem usar `mongoPrisma`:

```typescript
// app/api/products/route.ts
import mongoPrisma from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  const products = await mongoPrisma.product.findMany({
    include: { category: true },
  });
  // ...
}
```

As APIs de usuários/pedidos continuam usando `postgresPrisma`:

```typescript
// app/api/orders/route.ts
import postgresPrisma from '@/lib/postgres';

export async function GET() {
  const orders = await postgresPrisma.order.findMany();
  // ...
}
```

## 📦 Deploy no Render

### 1. Criar Conta no Render

1. Acesse: https://render.com
2. Faça login com GitHub
3. Conecte seu repositório

### 2. Configurar Serviço

1. **New** > **Web Service**
2. Conecte o repositório: `Aldebaran-LW/Materiais_de_Construcao`
3. Configure:
   - **Root Directory:** `nextjs_space`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`

### 3. Variáveis de Ambiente

No Render Dashboard, adicione todas as variáveis do `.env`:

- `MONGODB_URI`
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV=production`

### 4. Usar render.yaml (Opcional)

O arquivo `render.yaml` já está configurado. Você pode:
- Fazer commit do arquivo
- Render detecta automaticamente
- Ou configurar manualmente no dashboard

## 🔄 Atualizar APIs Existentes

### APIs que usam MongoDB:

- ✅ `app/api/products/route.ts`
- ✅ `app/api/products/[slug]/route.ts`
- ✅ `app/api/categories/route.ts`
- ✅ `app/api/admin/products/route.ts`
- ✅ `app/api/admin/products/[productId]/route.ts`

### APIs que usam PostgreSQL:

- ✅ `app/api/orders/route.ts`
- ✅ `app/api/cart/route.ts`
- ✅ `app/api/admin/stats/route.ts`
- ✅ `app/api/admin/clients/route.ts`
- ✅ Todas as rotas de autenticação

## 📝 Exemplo de Atualização

### Antes (Supabase):
```typescript
import prisma from '@/lib/db';

const products = await prisma.product.findMany();
```

### Depois (MongoDB):
```typescript
import mongoPrisma from '@/lib/mongodb';

const products = await mongoPrisma.product.findMany();
```

## ⚠️ Considerações Importantes

### 1. IDs Diferentes
- MongoDB usa `ObjectId` (ex: `507f1f77bcf86cd799439011`)
- PostgreSQL usa `cuid` (ex: `clx1234567890`)
- `CartItem` e `OrderItem` armazenam `productId` como String (compatível com ambos)

### 2. Relacionamentos
- Produtos referenciam categorias no MongoDB
- Pedidos referenciam produtos por ID (string)
- Não há foreign keys entre MongoDB e PostgreSQL

### 3. Transações
- MongoDB não suporta transações ACID como PostgreSQL
- Para operações críticas, use PostgreSQL
- Para catálogo, MongoDB é suficiente

## ✅ Vantagens desta Arquitetura

1. **Escalabilidade:** MongoDB escala melhor para catálogo
2. **Flexibilidade:** Fácil adicionar campos em produtos
3. **Performance:** MongoDB otimizado para leitura
4. **Segurança:** Dados críticos no PostgreSQL (ACID)
5. **Separação:** Produtos separados de dados transacionais

## 🧪 Testar Localmente

```bash
# 1. Gerar clientes Prisma
npm run prisma:generate

# 2. Migrar dados
npm run prisma:migrate

# 3. Rodar aplicação
npm run dev
```

## 📊 Estrutura Final

```
MongoDB (Atlas)
├── products (catálogo)
└── categories

Supabase (PostgreSQL)
├── users (autenticação)
├── orders (pedidos)
├── carts (carrinhos)
├── sessions (NextAuth)
└── accounts (NextAuth)
```

## 🚨 Troubleshooting

### Erro: "Cannot find module '@prisma/mongodb-client'"
```bash
npm run prisma:generate
```

### Erro: "MongoDB connection failed"
- Verifique `MONGODB_URI` no `.env`
- Verifique IP whitelist no MongoDB Atlas
- Verifique credenciais

### Erro: "PostgreSQL connection failed"
- Verifique `DATABASE_URL` no `.env`
- Verifique conexão com Supabase

---

**Arquitetura híbrida configurada! MongoDB para produtos, Supabase para o resto!** 🚀
