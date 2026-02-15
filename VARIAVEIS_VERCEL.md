# 🔐 Variáveis de Ambiente - Vercel Dashboard

## ✅ Variáveis que devem estar configuradas:

### 1. DATABASE_URL
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 2. NEXTAUTH_URL
```
https://seu-projeto.vercel.app
```
⚠️ **Substitua `seu-projeto.vercel.app` pela URL real do seu projeto na Vercel!**

### 3. NEXTAUTH_SECRET
```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```

### 4. NEXT_PUBLIC_SUPABASE_URL
```
https://vedrmtowoosqxzqxgxpb.supabase.co
```
⚠️ **CORREÇÃO:** O valor correto é `vedrmtowoosqxzqxgxpb` (não `vedrmtowoosqxzqxgpxb`)

### 5. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```

### 6. SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

## ⚠️ ERRO DETECTADO:

O `NEXT_PUBLIC_SUPABASE_URL` está com valor incorreto:
- ❌ **Atual:** `https://vedrmtowoosqxzqxgpxb.supabase.co`
- ✅ **Correto:** `https://vedrmtowoosqxzqxgxpb.supabase.co`

**Corrija isso na Vercel!**

## 📋 Checklist:

- [ ] DATABASE_URL configurada
- [ ] NEXTAUTH_URL com URL real da Vercel
- [ ] NEXTAUTH_SECRET configurada
- [ ] NEXT_PUBLIC_SUPABASE_URL **CORRIGIDA** (vedrmtowoosqxzqxgxpb)
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY configurada
- [ ] SUPABASE_SERVICE_ROLE_KEY configurada
- [ ] Todas aplicadas para Production, Preview e Development

## 🔄 Após corrigir:

1. Salve as alterações
2. Faça um redeploy (ou aguarde deploy automático)
3. Teste o catálogo novamente

---

**Corrija o NEXT_PUBLIC_SUPABASE_URL e todas as variáveis devem funcionar!**
