# 🔐 Criar Usuários no Supabase (Produção)

## ⚠️ Problema

O erro 401 (Unauthorized) ocorre porque os usuários não existem no banco de dados Supabase.

## ✅ Solução: Executar Seed de Usuários

### Opção 1: Via Script (Recomendado)

Execute o script que cria apenas os usuários:

```powershell
cd nextjs_space
npm run seed-users
```

Ou diretamente:

```powershell
npx tsx --require dotenv/config scripts/seed-users-only.ts
```

### Opção 2: Via Prisma Studio (Manual)

1. Execute o Prisma Studio:
   ```powershell
   npx prisma studio --schema=./prisma/schema-postgres.prisma
   ```

2. Acesse: http://localhost:5555
3. Vá na tabela `users`
4. Clique em "Add record"
5. Preencha os campos:
   - **email**: `admin@macofel.com`
   - **password**: (hash bcrypt de `admin123`)
   - **firstName**: `Admin`
   - **lastName**: `MACOFEL`
   - **role**: `ADMIN`

### Opção 3: Via SQL no Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. Vá em **SQL Editor**
4. Execute o seguinte SQL:

```sql
-- Criar hash da senha admin123
-- Use um gerador online de bcrypt ou execute o script

-- Exemplo (você precisa gerar o hash primeiro):
INSERT INTO users (id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@macofel.com',
  '$2a$10$rK8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X', -- Substitua pelo hash real
  'Admin',
  'MACOFEL',
  'ADMIN',
  NOW(),
  NOW()
);
```

**⚠️ Importante:** Você precisa gerar o hash bcrypt da senha `admin123` primeiro.

## 🔑 Credenciais Após Seed

**Administrador:**
- Email: `admin@macofel.com`
- Senha: `admin123`

**Cliente:**
- Email: `cliente@teste.com`
- Senha: `cliente123`

## 🔍 Verificar se Funcionou

Após executar o seed, teste o login:
1. Acesse: https://materiais-de-construcao.vercel.app/login
2. Use as credenciais acima
3. O login deve funcionar sem erro 401

## 🛠️ Troubleshooting

### Erro: "Can't reach database server"
- Verifique se a `DATABASE_URL` no `.env` está correta
- Confirme que o Supabase está ativo

### Erro: "Table does not exist"
- Execute primeiro: `npx prisma db push --schema=./prisma/schema-postgres.prisma`
- Ou crie as tabelas manualmente via SQL no Supabase

### Erro: "User already exists"
- O script verifica se o usuário já existe e não cria duplicatas
- Isso é normal e não é um erro
