# ⚠️ Configuração do Banco de Dados - Ação Necessária

## Problema Identificado

O erro "FATAL: Tenant or user not found" indica que a connection string do Supabase precisa ser obtida diretamente do dashboard.

## ✅ Solução: Obter Connection String do Supabase

### Passo 1: Acessar o Dashboard
1. Acesse: https://app.supabase.com
2. Faça login na sua conta
3. Selecione o projeto: `vedrmtowoosqxzqxgxpb`

### Passo 2: Obter a Connection String
1. No menu lateral, clique em **Settings** (Configurações)
2. Clique em **Database**
3. Role até a seção **Connection string**
4. Selecione a aba **URI** ou **Connection pooling**
5. Copie a connection string completa

### Passo 3: Atualizar o arquivo .env

Abra o arquivo `nextjs_space/.env` e substitua a linha `DATABASE_URL` pela connection string copiada do Supabase.

**Formato esperado:**
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
```

**Ou para connection pooling:**
```
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### Passo 4: Verificar a Senha

Certifique-se de que a senha no `.env` corresponde à senha do banco:
- Senha fornecida: `2TLgRvRHOOVCyo7M`
- Se a senha foi alterada no Supabase, use a senha atual

### Passo 5: Testar a Conexão

Após atualizar o `.env`, execute:

```powershell
cd nextjs_space
npx prisma db push --accept-data-loss
```

Se funcionar, você verá:
```
✔ Your database is now in sync with your Prisma schema.
```

## 🔍 Verificar Connection String

A connection string do Supabase geralmente tem um destes formatos:

**Conexão Direta (porta 5432):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**Connection Pooling (porta 6543):**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Transaction Mode (porta 6543):**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&pgbouncer=true
```

## 📝 Credenciais Atuais

- **Project Ref:** `vedrmtowoosqxzqxgxpb`
- **Senha:** `2TLgRvRHOOVCyo7M`
- **URL:** `https://vedrmtowoosqxzqxgxpb.supabase.co`

## ⚠️ Importante

1. **Nunca commite o arquivo `.env`** - ele já está no `.gitignore`
2. A connection string deve ser copiada **exatamente** como aparece no dashboard
3. Se a senha foi resetada no Supabase, atualize no `.env`

## 🆘 Se Ainda Não Funcionar

1. Verifique se o projeto Supabase está ativo
2. Verifique se a senha está correta
3. Tente resetar a senha do banco no Supabase Dashboard
4. Use a connection string do tipo "Session" em vez de "Transaction"

---

**Após configurar corretamente, execute:**
```powershell
npx prisma db push --accept-data-loss
npx prisma db seed
npm run dev
```
