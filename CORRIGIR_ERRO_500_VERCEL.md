# 🔧 Corrigir Erro 500 nas APIs - Vercel

## ⚠️ Problema

As APIs `/api/products` e `/api/categories` estão retornando **500 (Internal Server Error)** no Vercel.

## 🔍 Causa Provável

A variável `MONGODB_URI` no Vercel **não tem o nome do banco de dados**.

## ✅ Solução

### Passo 1: Atualizar MONGODB_URI no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto: **materiais-de-construção**
3. Vá em **Settings** > **Environment Variables**
4. Encontre `MONGODB_URI`
5. **Edite** e atualize para:

```
mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/macofel?retryWrites=true&w=majority
```

**⚠️ IMPORTANTE:** Note o `/macofel` antes do `?` - isso é o nome do banco de dados!

### Passo 2: Verificar Outras Variáveis

Certifique-se de que todas estas variáveis estão configuradas:

```
MONGODB_URI=mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/macofel?retryWrites=true&w=majority

DATABASE_URL=postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

NEXTAUTH_URL=https://materiais-de-construcao.vercel.app

NEXTAUTH_SECRET=HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=

NEXT_PUBLIC_SUPABASE_URL=https://vedrmtowoosqxzqxgxpb.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

### Passo 3: Redeploy

Após atualizar as variáveis:

1. Vá em **Deployments**
2. Clique nos **três pontos** do último deploy
3. Selecione **Redeploy**
4. Ou faça um novo commit (qualquer alteração) para trigger automático

### Passo 4: Verificar Logs

1. Vá em **Logs** no dashboard do Vercel
2. Procure por erros relacionados a:
   - `MONGODB_URI`
   - `empty database name`
   - `PrismaClientInitializationError`

## 🔍 Verificar se Funcionou

1. Aguarde o deploy completar (2-3 minutos)
2. Acesse: https://materiais-de-construcao.vercel.app/catalogo
3. Abra o DevTools (F12) > Console
4. Verifique se ainda há erros 500
5. Os produtos devem aparecer!

## 📋 Checklist

- [ ] `MONGODB_URI` atualizada com `/macofel`
- [ ] Todas as 7 variáveis configuradas
- [ ] Variáveis marcadas para: ✅ Production, ✅ Preview, ✅ Development
- [ ] Redeploy executado
- [ ] Logs verificados
- [ ] Catálogo testado

## 🎯 Formato Correto da Connection String

```
mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
                                                          ^^^^^^^^^^^^^^^^
                                                          Nome do banco!
```

**Exemplo correto:**
```
mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/macofel?retryWrites=true&w=majority
```

---

**Atualize a `MONGODB_URI` no Vercel agora!** 🚀
