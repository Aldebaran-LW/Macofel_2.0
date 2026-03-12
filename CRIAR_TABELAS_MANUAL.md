# 📋 Criar Tabelas Manualmente no Supabase

## ⚠️ Problema

O `npx prisma db push` está tendo problemas com o Transaction Pooler. Vamos criar as tabelas manualmente via SQL.

## ✅ Solução: Executar SQL no Supabase

### Passo 1: Acessar SQL Editor

1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar o Script SQL

1. Clique em **New query**
2. Abra o arquivo `create-tables.sql` neste projeto
3. Copie TODO o conteúdo do arquivo
4. Cole no SQL Editor do Supabase
5. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 3: Verificar

Após executar, você deve ver:
- ✅ "Success. No rows returned"
- Ou mensagem de sucesso

### Passo 4: Verificar no Prisma Studio

1. Feche o Prisma Studio atual (Ctrl+C no terminal)
2. Execute novamente: `npx prisma studio`
3. Agora você deve ver todas as tabelas!

## 📝 Após Criar as Tabelas:

```powershell
cd nextjs_space
npx prisma db seed
npm run dev
```

## 🎯 Tabelas que Serão Criadas:

- ✅ users
- ✅ accounts
- ✅ sessions
- ✅ verification_tokens
- ✅ categories
- ✅ products
- ✅ carts
- ✅ cart_items
- ✅ orders
- ✅ order_items

---

**Execute o SQL no Supabase Dashboard e depois volte aqui!**
