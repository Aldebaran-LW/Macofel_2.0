# 🔐 Corrigir Erro 401 (Unauthorized) no Vercel

## ⚠️ Problema

O erro 401 ocorre porque as variáveis de ambiente não estão configuradas corretamente no Vercel ou estão faltando.

## ✅ Solução: Configurar Variáveis no Vercel

### Passo 1: Acessar o Dashboard da Vercel

1. Acesse: https://vercel.com
2. Faça login
3. Selecione o projeto: `materiais-de-construcao` (ou o nome do seu projeto)

### Passo 2: Configurar Variáveis de Ambiente

1. Vá em **Settings** > **Environment Variables**
2. Adicione/verifique as seguintes variáveis:

#### 🔴 OBRIGATÓRIAS (para autenticação funcionar):

**1. DATABASE_URL**
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
⚠️ **IMPORTANTE:** Se a senha for diferente, use a senha correta do Supabase.

**2. NEXTAUTH_URL** ⚠️ **CRÍTICO**
```
https://materiais-de-construcao.vercel.app
```
⚠️ **DEVE SER A URL DE PRODUÇÃO!** Não use `http://localhost:3000` em produção.

**3. NEXTAUTH_SECRET**
```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```
⚠️ **IMPORTANTE:** Esta chave deve ser a mesma usada localmente.

#### 🟡 OPCIONAIS (mas recomendadas):

**4. NEXT_PUBLIC_SUPABASE_URL**
```
https://vedrmtowoosqxzqxgxpb.supabase.co
```

**5. NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```

**6. SUPABASE_SERVICE_ROLE_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

**7. MONGODB_URI** (se estiver usando MongoDB)
```
mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/test?retryWrites=true&w=majority
```

### Passo 3: Aplicar para Todos os Ambientes

Para cada variável, marque:
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

### Passo 4: Salvar e Fazer Redeploy

1. Clique em **Save** para salvar todas as variáveis
2. Vá em **Deployments**
3. Clique nos **3 pontos** do último deploy
4. Selecione **Redeploy**
5. Aguarde o deploy concluir

## 🔍 Verificar se Funcionou

Após o redeploy:

1. Acesse: https://materiais-de-construcao.vercel.app/login
2. Tente fazer login com:
   - Email: `admin@macofel.com`
   - Senha: `admin123`
3. O erro 401 deve desaparecer

## 🛠️ Troubleshooting

### Erro 401 ainda persiste?

**1. Verificar logs do Vercel:**
- Vá em **Deployments** > **Último deploy** > **Functions** > **api/auth/[...nextauth]**
- Veja se há erros relacionados a `DATABASE_URL` ou `NEXTAUTH_SECRET`

**2. Verificar se o usuário existe no banco:**
- Execute localmente: `npm run seed-users`
- Ou verifique no Supabase Dashboard > Table Editor > users

**3. Verificar NEXTAUTH_URL:**
- Deve ser exatamente: `https://materiais-de-construcao.vercel.app`
- **NÃO** use `http://localhost:3000` em produção

**4. Verificar DATABASE_URL:**
- A senha deve estar codificada (se contiver `/`, use `%2F`)
- Use Session Pooler (porta 6543) para IPv4

**5. Verificar NEXTAUTH_SECRET:**
- Deve ser o mesmo valor usado localmente
- Se não souber, gere um novo: `openssl rand -base64 32`
- Atualize tanto no `.env` local quanto no Vercel

## 📋 Checklist Final

- [ ] DATABASE_URL configurada corretamente
- [ ] NEXTAUTH_URL = `https://materiais-de-construcao.vercel.app`
- [ ] NEXTAUTH_SECRET configurada
- [ ] Todas as variáveis aplicadas para Production, Preview e Development
- [ ] Redeploy realizado
- [ ] Usuários criados no banco (via `npm run seed-users`)
- [ ] Teste de login realizado

## 🎯 Próximos Passos

Após corrigir as variáveis e fazer redeploy:

1. Teste o login novamente
2. Se ainda houver erro, verifique os logs do Vercel
3. Confirme que os usuários existem no banco Supabase

---

**O erro 401 deve ser resolvido após configurar corretamente as variáveis de ambiente no Vercel!**
