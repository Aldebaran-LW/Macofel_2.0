# 🚀 Deploy na Vercel com Token

## Token Configurado

Você forneceu um token da Vercel. Vamos fazer o deploy!

## 📋 Opções de Deploy

### Opção 1: Via CLI da Vercel (Recomendado)

```powershell
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# No diretório do projeto
cd nextjs_space

# Fazer login com o token
vercel login --token vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk

# Deploy para preview
vercel

# Deploy para produção
vercel --prod
```

### Opção 2: Via Dashboard da Vercel

1. Acesse: https://vercel.com
2. Faça login
3. Vá em **Settings** > **Tokens**
4. Use o token fornecido se necessário
5. Importe o projeto do GitHub

## ⚙️ Configuração do Projeto

### Root Directory

Quando a Vercel perguntar sobre o root directory, responda:
```
nextjs_space
```

### Build Settings

- **Framework Preset:** Next.js
- **Root Directory:** `nextjs_space`
- **Build Command:** `npm run build` (já configurado)
- **Output Directory:** `.next` (padrão)

## 🔐 Variáveis de Ambiente

**IMPORTANTE:** Configure todas as variáveis na Vercel antes do deploy!

No Dashboard da Vercel: **Settings** > **Environment Variables**

### Variáveis Necessárias:

```env
DATABASE_URL=postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

```env
NEXTAUTH_URL=https://seu-projeto.vercel.app
```
⚠️ **Substitua `seu-projeto.vercel.app` pela URL real após o primeiro deploy!**

```env
NEXTAUTH_SECRET=HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://vedrmtowoosqxzqxgxpb.supabase.co
```

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

### Aplicar Para:

- ✅ Production
- ✅ Preview  
- ✅ Development

## 🚀 Comandos Rápidos

### Deploy Inicial (Preview)

```powershell
cd nextjs_space
vercel --token vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk
```

### Deploy para Produção

```powershell
vercel --prod --token vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk
```

### Verificar Status

```powershell
vercel ls
```

## ⚠️ Importante

1. **NEXTAUTH_URL:** Após o primeiro deploy, atualize com a URL real da Vercel
2. **Token:** Mantenha o token seguro, não compartilhe publicamente
3. **Variáveis:** Configure todas antes do primeiro deploy

## ✅ Checklist

- [ ] Token configurado
- [ ] Vercel CLI instalado
- [ ] Login realizado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy inicial executado
- [ ] NEXTAUTH_URL atualizado com URL real
- [ ] Deploy de produção executado

---

**Após o deploy, seu projeto estará online!** 🎉
