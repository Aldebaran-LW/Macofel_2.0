# 🔐 Corrigir Login em Produção

## ⚠️ Problema

O login funciona localmente (`http://localhost:3003`) mas não funciona remotamente (`https://macofel-dois.lwdigitalforge.com/`).

## ✅ Solução: Configurar Variáveis de Ambiente na Vercel

### Passo 1: Acessar o Dashboard da Vercel

1. Acesse: https://vercel.com
2. Faça login
3. Selecione o projeto: `Macofel_2.0` (ou o nome do seu projeto)

### Passo 2: Configurar Variáveis de Ambiente

1. Vá em **Settings** > **Environment Variables**
2. Adicione/verifique as seguintes variáveis:

#### 🔴 OBRIGATÓRIAS (para autenticação funcionar):

**1. NEXTAUTH_URL** ⚠️ **CRÍTICO - MAIS IMPORTANTE**
```
https://macofel-dois.lwdigitalforge.com
```
⚠️ **DEVE SER EXATAMENTE A URL DE PRODUÇÃO!**
- ✅ Deve começar com `https://`
- ✅ Deve ser a URL completa sem barra no final
- ❌ NÃO use `http://localhost:3003` em produção
- ❌ NÃO use `https://macofel-dois.lwdigitalforge.com/` (com barra)

**2. NEXTAUTH_SECRET** ⚠️ **CRÍTICO**
```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```
⚠️ **DEVE SER O MESMO VALOR USADO LOCALMENTE!**
- Se você gerou um novo secret localmente, atualize também no Vercel
- Para gerar um novo: `openssl rand -base64 32`

**3. DATABASE_URL** ⚠️ **CRÍTICO**
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
⚠️ **DEVE APONTAR PARA O SUPABASE DE PRODUÇÃO!**
- Verifique se a senha está correta
- Use Session Pooler (porta 6543) para IPv4

**4. MONGODB_URI** (se estiver usando)
```
mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/test?retryWrites=true&w=majority
```

#### 🟡 OPCIONAIS (mas recomendadas):

**5. NEXT_PUBLIC_SUPABASE_URL**
```
https://vedrmtowoosqxzqxgxpb.supabase.co
```

**6. NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```

**7. SUPABASE_SERVICE_ROLE_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

### Passo 3: Aplicar para Todos os Ambientes

⚠️ **IMPORTANTE:** Marque as variáveis para:
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

### Passo 4: Fazer Redeploy

Após configurar as variáveis:

1. Vá em **Deployments**
2. Clique nos três pontos (...) do último deployment
3. Selecione **Redeploy**
4. Aguarde o deploy concluir

## 🔍 Verificar se Está Funcionando

### 1. Testar Login Cliente
- Acesse: `https://macofel-dois.lwdigitalforge.com/login`
- Tente fazer login com credenciais de cliente
- Deve redirecionar para `/minha-conta`

### 2. Testar Login Admin
- Acesse: `https://macofel-dois.lwdigitalforge.com/admin/login`
- Tente fazer login com credenciais de admin
- Deve redirecionar para `/admin/dashboard`

### 3. Verificar Cookies no Navegador

1. Abra o DevTools (F12)
2. Vá em **Application** > **Cookies**
3. Verifique se há cookies do NextAuth:
   - `__Secure-next-auth.session-token` (em produção)
   - `next-auth.session-token` (em desenvolvimento)

## 🐛 Problemas Comuns

### Erro: "NEXTAUTH_URL not set"
**Solução:** Configure `NEXTAUTH_URL` com a URL completa de produção (sem barra no final)

### Erro: "Invalid credentials"
**Solução:** 
1. Verifique se o usuário existe no banco de dados
2. Execute `npm run seed-users` localmente para criar usuários

### Erro: Cookies não são salvos
**Solução:**
1. Verifique se `NEXTAUTH_URL` começa com `https://`
2. Verifique se o domínio está correto
3. Limpe os cookies do navegador e tente novamente

### Erro: Redirecionamento infinito
**Solução:**
1. Verifique se `NEXTAUTH_URL` está correto
2. Verifique se o middleware está configurado corretamente
3. Limpe os cookies do navegador

## 📋 Checklist Final

- [ ] `NEXTAUTH_URL` = `https://macofel-dois.lwdigitalforge.com` (sem barra)
- [ ] `NEXTAUTH_SECRET` configurada
- [ ] `DATABASE_URL` configurada
- [ ] `MONGODB_URI` configurada (se necessário)
- [ ] Todas as variáveis aplicadas para Production, Preview e Development
- [ ] Redeploy realizado
- [ ] Login testado em produção

## 🔄 Após Corrigir

1. Salve todas as alterações
2. Faça um redeploy
3. Teste o login novamente
4. Verifique os cookies no navegador

---

**O problema mais comum é `NEXTAUTH_URL` incorreto ou não configurado!**
