# 🚀 Deploy Completo na Vercel - Guia Passo a Passo

## ✅ Tudo Pronto para Deploy!

O projeto está configurado e pronto para deploy na Vercel.

## 📋 Passo 1: Acessar Vercel

1. **Acesse:** https://vercel.com
2. **Faça login** com sua conta GitHub
   - Se não tiver conta, crie uma (gratuito)
   - Use "Sign in with GitHub"

## 📦 Passo 2: Importar Projeto

1. **Clique em:** "Add New Project" ou "Import Project"
2. **Selecione o repositório:** `Aldebaran-LW/Materiais_de_Construcao`
3. **Clique em:** "Import"

## ⚙️ Passo 3: Configurar Projeto

Na tela de configuração:

### Configurações Básicas:

- **Project Name:** `materiais-de-construcao` (ou o nome que preferir)
- **Framework Preset:** Next.js (deve detectar automaticamente)
- **Root Directory:** `nextjs_space` ⚠️ **IMPORTANTE!**
- **Build Command:** `npm run build` (já configurado no `vercel.json`)
- **Output Directory:** `.next` (padrão do Next.js)
- **Install Command:** `npm install --legacy-peer-deps` (já configurado)

### ⚠️ ATENÇÃO: Root Directory

**MUITO IMPORTANTE:** Configure o **Root Directory** como `nextjs_space`

Se não configurar, a Vercel vai procurar o `package.json` na raiz e não vai encontrar!

## 🔐 Passo 4: Configurar Variáveis de Ambiente

**ANTES de clicar em "Deploy"**, configure as variáveis:

1. **Clique em:** "Environment Variables"
2. **Adicione cada variável abaixo:**

### Variáveis Obrigatórias:

#### 1. **MONGODB_URI** (MongoDB Atlas - Produtos)
```
mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority
```
- Aplicar para: ✅ Production, ✅ Preview, ✅ Development

#### 2. **DATABASE_URL** (Supabase PostgreSQL - Dados Burocráticos)
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
- Aplicar para: ✅ Production, ✅ Preview, ✅ Development

#### 3. **NEXTAUTH_URL**
```
https://seu-projeto.vercel.app
```
⚠️ **IMPORTANTE:** 
- Deixe assim por enquanto
- Após o primeiro deploy, a Vercel vai dar uma URL (ex: `https://materiais-de-construcao-abc123.vercel.app`)
- Volte aqui e atualize com a URL real!

- Aplicar para: ✅ Production, ✅ Preview, ✅ Development

#### 4. **NEXTAUTH_SECRET**
```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```
- Aplicar para: ✅ Production, ✅ Preview, ✅ Development

#### 5. **NEXT_PUBLIC_SUPABASE_URL**
```
https://vedrmtowoosqxzqxgxpb.supabase.co
```
- Aplicar para: ✅ Production, ✅ Preview, ✅ Development

#### 6. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```
- Aplicar para: ✅ Production, ✅ Preview, ✅ Development

#### 7. **SUPABASE_SERVICE_ROLE_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```
- Aplicar para: ✅ Production, ✅ Preview, ✅ Development

#### 8. **NODE_ENV** (Opcional - já configurado no vercel.json)
```
production
```
- Aplicar para: ✅ Production, ✅ Preview, ✅ Development

## 🚀 Passo 5: Deploy!

1. **Revise todas as configurações**
2. **Verifique se todas as variáveis foram adicionadas**
3. **Clique em:** "Deploy"

### O que acontece:

1. Vercel clona o repositório
2. Instala dependências: `npm install --legacy-peer-deps`
3. Gera clientes Prisma: `npm run prisma:generate` (via postinstall)
4. Build do Next.js: `npm run build`
5. Deploy automático!

## ⏱️ Tempo de Deploy

- **Primeira vez:** 3-5 minutos
- **Deploys futuros:** 1-2 minutos

## ✅ Passo 6: Após o Deploy

### 1. Anotar a URL

Você receberá uma URL como:
```
https://materiais-de-construcao-abc123.vercel.app
```

### 2. Atualizar NEXTAUTH_URL

1. Vá em **Settings** > **Environment Variables**
2. Encontre `NEXTAUTH_URL`
3. Edite e coloque a URL real que você recebeu
4. Salve
5. **Redeploy automático** vai acontecer

### 3. Testar a Aplicação

1. **Acesse a URL** fornecida pela Vercel
2. **Teste:**
   - ✅ Página inicial carrega?
   - ✅ Catálogo mostra produtos? (MongoDB)
   - ✅ Login funciona? (Supabase)
   - ✅ Admin funciona? (Supabase)

## 🔍 Troubleshooting

### Erro: "Cannot find module '@prisma/client'"

**Solução:** Verifique se `postinstall` está no `package.json`:
```json
{
  "scripts": {
    "postinstall": "npm run prisma:generate"
  }
}
```
✅ Já está configurado!

### Erro: "Database connection failed"

**Solução:**
1. Verifique se `MONGODB_URI` está correto
2. Verifique se `DATABASE_URL` está correto
3. Verifique se o MongoDB Atlas permite conexões (Network Access)
4. Verifique se o Supabase permite conexões externas

### Erro: "NEXTAUTH_URL not set"

**Solução:** 
1. Configure `NEXTAUTH_URL` com a URL real do Vercel
2. Faça redeploy

### Build falha

**Solução:**
1. Veja os logs de build na Vercel
2. Verifique se `Root Directory` está como `nextjs_space`
3. Teste `npm run build` localmente primeiro

## 📊 Verificar Deploy

### Logs de Build:

1. Vá em **Deployments**
2. Clique no deploy mais recente
3. Veja os logs completos

### Verificar Variáveis:

1. Vá em **Settings** > **Environment Variables**
2. Verifique se todas estão lá
3. Verifique se estão aplicadas para Production

## 🔄 Deploy Automático

Após o primeiro deploy:

- ✅ **A cada push no GitHub** → Deploy automático
- ✅ **Preview deployments** para cada PR
- ✅ **Production deployment** para push na `main`

## 🎯 Checklist Final

Antes de fazer deploy, verifique:

- [x] Repositório conectado no GitHub
- [ ] Root Directory configurado: `nextjs_space`
- [ ] Todas as variáveis de ambiente adicionadas
- [ ] `MONGODB_URI` configurado
- [ ] `DATABASE_URL` configurado
- [ ] `NEXTAUTH_SECRET` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `NEXTAUTH_URL` será atualizado após deploy

## 🎉 Pronto!

Após seguir estes passos, seu site estará online e funcionando!

**URL do site:** `https://seu-projeto.vercel.app`

**Tudo 100% GRATUITO!** ✅

---

**Boa sorte com o deploy!** 🚀
