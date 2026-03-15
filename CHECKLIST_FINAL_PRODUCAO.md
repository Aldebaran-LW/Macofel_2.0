# ✅ Checklist Final - Produção

## 🎉 Status: URLs Configuradas no Supabase!

Todas as URLs necessárias já estão configuradas no Supabase Authentication. Agora é necessário verificar as variáveis de ambiente na Vercel.

## 📋 Checklist de Variáveis de Ambiente na Vercel

### 🔴 OBRIGATÓRIAS (para autenticação funcionar):

- [ ] **NEXTAUTH_URL**
  ```
  https://macofel-dois.lwdigitalforge.com
  ```
  ⚠️ **CRÍTICO:** Deve ser exatamente esta URL (sem barra no final)

- [ ] **NEXTAUTH_SECRET**
  ```
  HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
  ```
  ⚠️ Deve ser o mesmo valor usado localmente

- [ ] **DATABASE_URL**
  ```
  postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
  ⚠️ Connection string do Supabase PostgreSQL

- [ ] **MONGODB_URI**
  ```
  mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/test?retryWrites=true&w=majority
  ```
  ⚠️ Connection string do MongoDB Atlas

### 🟡 RECOMENDADAS:

- [ ] **NEXT_PUBLIC_SUPABASE_URL**
  ```
  https://vedrmtowoosqxzqxgxpb.supabase.co
  ```

- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY**
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
  ```

- [ ] **SUPABASE_SERVICE_ROLE_KEY**
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
  ```

## ⚠️ IMPORTANTE: Aplicar para Todos os Ambientes

Certifique-se de que todas as variáveis estão marcadas para:
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

## 🔍 Como Verificar na Vercel

1. **Acesse:** https://vercel.com
2. **Selecione o projeto:** Materiais_de_Construção
3. **Vá em:** Settings > Environment Variables
4. **Verifique cada variável:**
   - Está configurada?
   - Valor está correto?
   - Está marcada para Production, Preview e Development?

## ✅ URLs no Supabase Authentication

Todas as URLs necessárias já estão configuradas:
- ✅ `https://macofel-dois.lwdigitalforge.com`
- ✅ `https://macofel-dois.lwdigitalforge.com/**`
- ✅ `https://macofel-dois.lwdigitalforge.com/*`
- ✅ `https://macofel-dois.lwdigitalforge.com/api/auth/callback/*`
- ✅ URLs de localhost (3000, 3003, 5555)
- ✅ URLs do Vercel

## 🧪 Testes Finais

Após configurar todas as variáveis na Vercel:

1. **Faça um redeploy:**
   - Vá em Deployments
   - Clique nos três pontos (...) do último deployment
   - Selecione "Redeploy"

2. **Teste o login cliente:**
   - Acesse: `https://macofel-dois.lwdigitalforge.com/login`
   - Faça login com credenciais de cliente
   - Deve redirecionar para `/minha-conta`

3. **Teste o login admin:**
   - Acesse: `https://macofel-dois.lwdigitalforge.com/admin/login`
   - Faça login com credenciais de admin
   - Deve redirecionar para `/admin/dashboard`

4. **Verifique cookies:**
   - Abra DevTools (F12)
   - Vá em Application > Cookies
   - Deve haver cookies do NextAuth

## 🎯 Próximos Passos

1. ✅ URLs no Supabase - **CONCLUÍDO**
2. ⏳ Variáveis na Vercel - **VERIFICAR**
3. ⏳ Redeploy - **APÓS CONFIGURAR VARIÁVEIS**
4. ⏳ Testes em produção - **APÓS REDEPLOY**

---

**Após completar este checklist, o login deve funcionar perfeitamente em produção!**
