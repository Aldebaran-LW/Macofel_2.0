# 🚀 Deploy Alternativo - Dashboard da Vercel

## ⚠️ Token não funcionou via CLI

Se o token não funcionar via CLI, use o Dashboard da Vercel (mais fácil e recomendado).

## 📋 Passo a Passo - Dashboard

### 1. Acessar Vercel

1. Acesse: https://vercel.com
2. Faça login com sua conta (GitHub, GitLab, ou Bitbucket)

### 2. Importar Projeto

1. Clique em **"Add New Project"** ou **"Import Project"**
2. Selecione o repositório: `Aldebaran-LW/Materiais_de_Construcao`
3. Clique em **"Import"**

### 3. Configurar Projeto

Na tela de configuração:

- **Project Name:** `macofel-ecommerce` (ou o nome que preferir)
- **Framework Preset:** Next.js (deve detectar automaticamente)
- **Root Directory:** `nextjs_space` ⚠️ **IMPORTANTE!**
- **Build Command:** `npm run build` (padrão)
- **Output Directory:** `.next` (padrão)
- **Install Command:** `npm install` (padrão)

### 4. Configurar Variáveis de Ambiente

**ANTES de clicar em "Deploy"**, configure as variáveis:

1. Clique em **"Environment Variables"**
2. Adicione cada variável:

#### Variáveis Obrigatórias:

**DATABASE_URL**
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```
Aplicar para: ✅ Production, ✅ Preview, ✅ Development

**NEXTAUTH_URL**
```
https://seu-projeto.vercel.app
```
⚠️ **Atualize após o primeiro deploy com a URL real!**
Aplicar para: ✅ Production, ✅ Preview, ✅ Development

**NEXTAUTH_SECRET**
```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```
Aplicar para: ✅ Production, ✅ Preview, ✅ Development

**NEXT_PUBLIC_SUPABASE_URL**
```
https://vedrmtowoosqxzqxgxpb.supabase.co
```
Aplicar para: ✅ Production, ✅ Preview, ✅ Development

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```
Aplicar para: ✅ Production, ✅ Preview, ✅ Development

**SUPABASE_SERVICE_ROLE_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```
Aplicar para: ✅ Production, ✅ Preview, ✅ Development

### 5. Fazer Deploy

1. Após configurar todas as variáveis, clique em **"Deploy"**
2. Aguarde o build (pode levar 2-5 minutos)
3. Após o deploy, copie a URL fornecida

### 6. Atualizar NEXTAUTH_URL

1. Após o primeiro deploy, copie a URL (ex: `https://macofel-ecommerce.vercel.app`)
2. Vá em **Settings** > **Environment Variables**
3. Edite `NEXTAUTH_URL` e atualize com a URL real
4. Salve
5. Um novo deploy será feito automaticamente

## ✅ Verificar Deploy

1. Acesse a URL fornecida pela Vercel
2. Teste o login
3. Verifique se as páginas carregam
4. Teste funcionalidades do e-commerce

## 🔍 Troubleshooting

### Erro no Build

- Verifique os logs de build na Vercel
- Confirme que o Root Directory está como `nextjs_space`
- Verifique se todas as variáveis estão configuradas

### Erro de Conexão com Banco

- Verifique se `DATABASE_URL` está correta
- Use Transaction Pooler (porta 6543)
- Verifique se o Supabase permite conexões externas

### Erro de Autenticação

- Verifique se `NEXTAUTH_URL` está com a URL correta
- Confirme que `NEXTAUTH_SECRET` está configurado

---

**O Dashboard da Vercel é a forma mais fácil e confiável de fazer deploy!** 🎉
