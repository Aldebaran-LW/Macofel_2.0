# 🚀 Guia Rápido: MongoDB + Render

## ✅ O Que Foi Criado

1. **Schemas Prisma separados:**
   - `schema-mongodb.prisma` - Produtos e Categorias
   - `schema-postgres.prisma` - Dados burocráticos

2. **Clientes Prisma:**
   - `lib/mongodb.ts` - Cliente MongoDB
   - `lib/postgres.ts` - Cliente PostgreSQL

3. **Scripts:**
   - `scripts/migrate-to-mongodb.ts` - Migrar dados do Supabase para MongoDB
   - `scripts/seed-mongodb.ts` - Popular MongoDB com produtos iniciais

4. **Deploy:**
   - `render.yaml` - Configuração do Render

## 🎯 Passos Rápidos

### 1. Configurar .env

```env
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority"
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### 2. Gerar Clientes Prisma

```bash
npm run prisma:generate
```

### 3. Popular MongoDB

**Opção A - Migrar do Supabase:**
```bash
npm run prisma:migrate
```

**Opção B - Seed direto:**
```bash
tsx --require dotenv/config scripts/seed-mongodb.ts
```

### 4. Atualizar APIs

As APIs de produtos já foram atualizadas para usar MongoDB:
- ✅ `app/api/products/route.ts`

**Ainda precisa atualizar:**
- `app/api/products/[slug]/route.ts`
- `app/api/categories/route.ts`
- `app/api/admin/products/route.ts`
- `app/api/admin/products/[productId]/route.ts`

### 5. Deploy no Render

1. Acesse: https://render.com
2. **New** > **Web Service**
3. Conecte repositório GitHub
4. Configure:
   - **Root Directory:** `nextjs_space`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
5. Adicione variáveis de ambiente (todas do `.env`)

## ⚠️ Importante

### MongoDB Atlas - Whitelist IP

1. Acesse: https://cloud.mongodb.com
2. **Network Access** > **Add IP Address**
3. Para desenvolvimento: `0.0.0.0/0` (todos os IPs)
4. Para produção: Adicione IP do Render

### Render - Variáveis de Ambiente

Adicione todas estas no Render Dashboard:

```
MONGODB_URI=...
DATABASE_URL=...
NEXTAUTH_URL=https://seu-app.onrender.com
NEXTAUTH_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NODE_ENV=production
```

## 📝 Próximos Passos

1. ✅ Gerar clientes Prisma
2. ✅ Popular MongoDB
3. ⏳ Atualizar APIs restantes
4. ⏳ Testar localmente
5. ⏳ Deploy no Render

---

**Veja `ARQUITETURA_HIBRIDA_MONGODB.md` para detalhes completos!**
