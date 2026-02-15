# 🚀 Deploy de Dois Branches na Vercel

## 📋 Estrutura dos Branches

### Branch `main` - Supabase (PostgreSQL)
- ✅ Usa apenas **Supabase PostgreSQL**
- ✅ Schema: `prisma/schema.prisma`
- ✅ Cliente: `lib/db.ts` (Prisma padrão)
- ✅ Produtos e categorias no PostgreSQL

### Branch `mongodb` - Arquitetura Híbrida
- ✅ Usa **MongoDB** para produtos/categorias
- ✅ Usa **Supabase PostgreSQL** para usuários/pedidos
- ✅ Schemas: `prisma/schema-mongodb.prisma` + `prisma/schema-postgres.prisma`
- ✅ Clientes: `lib/mongodb.ts` + `lib/postgres.ts`

## 🎯 Configurar Deploy na Vercel

### Opção 1: Dois Projetos Separados (Recomendado)

#### Projeto 1: Main (Supabase)
1. Acesse: https://vercel.com
2. **Add New Project**
3. Importe: `Aldebaran-LW/Materiais_de_Construcao`
4. **Settings:**
   - **Root Directory:** `nextjs_space`
   - **Production Branch:** `main`
   - **Framework:** Next.js
5. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   NEXTAUTH_URL=https://macofel-main.vercel.app
   NEXTAUTH_SECRET=HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
   NEXT_PUBLIC_SUPABASE_URL=https://vedrmtowoosqxzqxgxpb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
   ```
6. **Deploy**

#### Projeto 2: MongoDB (Híbrido)
1. Acesse: https://vercel.com
2. **Add New Project**
3. Importe: `Aldebaran-LW/Materiais_de_Construcao`
4. **Settings:**
   - **Root Directory:** `nextjs_space`
   - **Production Branch:** `mongodb`
   - **Framework:** Next.js
5. **Environment Variables:**
   ```
   MONGODB_URI=mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority
   DATABASE_URL=postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   NEXTAUTH_URL=https://macofel-mongodb.vercel.app
   NEXTAUTH_SECRET=HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
   NEXT_PUBLIC_SUPABASE_URL=https://vedrmtowoosqxzqxgxpb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
   ```
6. **Deploy**

### Opção 2: Um Projeto com Preview Branches

1. Acesse: https://vercel.com
2. **Add New Project**
3. Importe: `Aldebaran-LW/Materiais_de_Construcao`
4. **Settings:**
   - **Root Directory:** `nextjs_space`
   - **Production Branch:** `main` (ou `mongodb`)
5. **Environment Variables:**
   - Adicione todas as variáveis acima
   - Marque: ✅ Production, ✅ Preview, ✅ Development
6. **Deploy**

**Resultado:**
- **Production:** Branch `main` (ou o que você escolher)
- **Preview:** Cada branch terá seu próprio preview URL
- **main:** `https://projeto-abc123.vercel.app`
- **mongodb:** `https://projeto-mongodb-abc123.vercel.app`

## 📝 URLs Finais

Após o deploy, você terá:

### Branch Main (Supabase)
```
https://macofel-main.vercel.app
```

### Branch MongoDB (Híbrido)
```
https://macofel-mongodb.vercel.app
```

## ✅ Checklist

### Branch Main
- [ ] Projeto criado na Vercel
- [ ] Branch: `main`
- [ ] Root Directory: `nextjs_space`
- [ ] 6 variáveis de ambiente (sem MONGODB_URI)
- [ ] Deploy concluído

### Branch MongoDB
- [ ] Projeto criado na Vercel (ou preview branch)
- [ ] Branch: `mongodb`
- [ ] Root Directory: `nextjs_space`
- [ ] 7 variáveis de ambiente (com MONGODB_URI)
- [ ] Deploy concluído

## 🎉 Pronto!

Agora você tem dois deploys funcionando:
- **Main:** Apenas Supabase
- **MongoDB:** Arquitetura híbrida

Ambos **100% GRATUITOS** na Vercel! ✅
