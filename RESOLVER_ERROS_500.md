# 🔧 Resolver Erros 500 nas APIs

## ❌ Problema Atual

Erros 500 em:
- `/api/categories` - Status 500
- `/api/products?page=1&limit=12` - Status 500

## 🔍 Causa Provável

A `DATABASE_URL` **não está configurada** ou está **incorreta** na Vercel.

## ✅ Solução: Configurar DATABASE_URL na Vercel

### Passo 1: Acessar Environment Variables

1. Acesse: https://vercel.com
2. Seu projeto: **materiais-de-construcao**
3. Vá em **Settings** > **Environment Variables**

### Passo 2: Adicionar DATABASE_URL

1. Clique em **"Adicionar variável de ambiente"** (Add environment variable)
2. **Nome:** `DATABASE_URL`
3. **Valor:** 
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

4. **Aplicar para:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Clique em **Salvar**

### Passo 3: Verificar Outras Variáveis

Certifique-se de que TODAS estas variáveis estão configuradas:

#### ✅ DATABASE_URL (CRÍTICA - Faltando!)
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### ✅ NEXTAUTH_URL
```
https://materiais-de-construcao.vercel.app
```
⚠️ **Use a URL real do seu projeto!**

#### ✅ NEXTAUTH_SECRET
```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```

#### ✅ NEXT_PUBLIC_SUPABASE_URL
```
https://vedrmtowoosqxzqxgxpb.supabase.co
```

#### ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```

#### ✅ SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

## 🔄 Após Configurar

1. **Salve todas as variáveis**
2. **Faça um redeploy:**
   - Vá em **Deployments**
   - Clique nos três pontos do último deploy
   - Selecione **"Redeploy"**
3. **Aguarde o novo deploy** (2-3 minutos)
4. **Teste novamente:** https://materiais-de-construcao.vercel.app/catalogo

## ✅ Resultado Esperado

Após configurar a `DATABASE_URL` e fazer redeploy:
- ✅ Erros 500 devem desaparecer
- ✅ Categorias devem carregar
- ✅ Produtos devem aparecer no catálogo
- ✅ Site funcionando completamente

## 🔍 Verificar se Funcionou

1. Acesse: https://materiais-de-construcao.vercel.app/catalogo
2. Abra o DevTools (F12) > Console
3. Não deve haver mais erros 500
4. Os produtos devem aparecer

---

**O problema é a DATABASE_URL não estar configurada na Vercel! Configure e faça redeploy.**
