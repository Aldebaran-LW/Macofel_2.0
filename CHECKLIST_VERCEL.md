# ✅ Checklist - Variáveis de Ambiente na Vercel

## 📋 Variáveis que DEVEM estar configuradas:

### ✅ 1. DATABASE_URL
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```
**Status:** ⚠️ Verifique se está configurada

### ✅ 2. NEXTAUTH_URL
```
https://seu-projeto.vercel.app
```
**Status:** ⚠️ Deve ser a URL real do seu projeto na Vercel
**Como encontrar:** Após o primeiro deploy, copie a URL fornecida pela Vercel

### ✅ 3. NEXTAUTH_SECRET
```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```
**Status:** ⚠️ Verifique se está configurada

### ✅ 4. NEXT_PUBLIC_SUPABASE_URL
```
https://vedrmtowoosqxzqxgxpb.supabase.co
```
**Status:** ✅ **CORRIGIDO!** Agora está correto

### ✅ 5. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```
**Status:** ✅ Configurada

### ✅ 6. SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```
**Status:** ⚠️ Verifique se está configurada

## ⚠️ IMPORTANTE:

### Aplicar para todos os ambientes:
- ✅ Production
- ✅ Preview
- ✅ Development

### Sobre o aviso de segurança:
O aviso sobre `NEXT_PUBLIC_*` é normal. Essas variáveis são **intencionalmente** públicas e seguras para expor no navegador. É o comportamento esperado do Next.js.

## 🔄 Próximos Passos:

1. **Adicione as variáveis faltantes:**
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (com URL real da Vercel)
   - `NEXTAUTH_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Salve todas as alterações**

3. **Faça um redeploy:**
   - Vá em Deployments
   - Clique nos três pontos do último deploy
   - Selecione "Redeploy"

4. **Teste o catálogo:**
   - Acesse a URL da Vercel
   - Vá em `/catalogo`
   - Os produtos devem aparecer

## ✅ Após configurar tudo:

O catálogo deve funcionar corretamente e os erros 500 devem desaparecer!

---

**Você já corrigiu o NEXT_PUBLIC_SUPABASE_URL! Agora adicione as outras variáveis.**
