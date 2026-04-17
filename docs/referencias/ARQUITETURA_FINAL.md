# 🏗️ Arquitetura Final - Frontend Supabase + Backend MongoDB

## 📋 Estrutura dos Branches

### Branch `main` - Frontend Supabase + Backend MongoDB
- ✅ **Frontend (páginas Server Components):** Supabase PostgreSQL
  - `app/page.tsx` → usa `prisma` de `lib/db.ts` (Supabase)
  - Autenticação, usuários, pedidos → Supabase
- ✅ **Backend (APIs):** MongoDB
  - `app/api/products/*` → usa `mongoPrisma` de `lib/mongodb.ts`
  - `app/api/categories/*` → usa `mongoPrisma`
  - `app/api/admin/products/*` → usa `mongoPrisma`
- ✅ **Schemas:** 
  - `prisma/schema-mongodb.prisma` (produtos/categorias)
  - `prisma/schema-postgres.prisma` (usuários/pedidos/carrinho)

### Branch `mongodb` - Arquitetura Híbrida Completa
- ✅ **Frontend:** Supabase PostgreSQL
- ✅ **Backend APIs:** MongoDB (produtos/categorias)
- ✅ **Backend APIs:** Supabase PostgreSQL (usuários/pedidos)
- ✅ Mesma estrutura do `main`, mas com histórico de commits diferente

## 🎯 Fluxo de Dados

### Frontend (Páginas)
```
app/page.tsx (Server Component)
  ↓
lib/db.ts (Prisma Supabase)
  ↓
Supabase PostgreSQL
  ├─ Usuários
  ├─ Pedidos
  ├─ Carrinho
  └─ Autenticação
```

### Backend (APIs)
```
app/api/products/* (API Routes)
  ↓
lib/mongodb.ts (Prisma MongoDB)
  ↓
MongoDB Atlas
  ├─ Produtos
  └─ Categorias
```

## 🔄 Diferença entre Branches

### Branch `main`
- **Frontend:** Supabase (produção)
- **Backend APIs:** MongoDB
- **Uso:** Produção principal

### Branch `mongodb`
- **Frontend:** Supabase
- **Backend APIs:** MongoDB
- **Uso:** Preview/desenvolvimento

**Nota:** Ambos têm a mesma arquitetura agora! A diferença é apenas histórica de commits.

## 🚀 Deploy na Vercel

### Variáveis de Ambiente (Ambos os Branches)

```
MONGODB_URI=mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority

DATABASE_URL=postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

NEXTAUTH_URL=https://seu-projeto.vercel.app

NEXTAUTH_SECRET=HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=

NEXT_PUBLIC_SUPABASE_URL=https://vedrmtowoosqxzqxgxpb.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

## ✅ Vantagens da Arquitetura

1. **Frontend Supabase:**
   - Autenticação robusta
   - RLS (Row Level Security)
   - Dados transacionais (pedidos, carrinho)

2. **Backend MongoDB:**
   - Escalabilidade para catálogo
   - Performance em leitura
   - Flexibilidade de schema

3. **Separação de Responsabilidades:**
   - Frontend → Supabase (produção)
   - Backend → MongoDB (catálogo)

## 📝 Arquivos Importantes

- `lib/db.ts` → Cliente Prisma Supabase (Frontend)
- `lib/mongodb.ts` → Cliente Prisma MongoDB (Backend APIs)
- `lib/postgres.ts` → Cliente Prisma PostgreSQL (alternativo)
- `prisma/schema-mongodb.prisma` → Schema MongoDB
- `prisma/schema-postgres.prisma` → Schema PostgreSQL

## 🎉 Status

✅ **Arquitetura configurada!**
✅ **Frontend → Supabase**
✅ **Backend → MongoDB**
✅ **Pronto para deploy!**
