# 🔧 Troubleshooting - Prisma DB Push

## ⚠️ Problema: Comando demora ou é cancelado

O `npx prisma db push` pode demorar alguns segundos para conectar e aplicar o schema.

## ✅ Soluções:

### Opção 1: Aguardar o Comando Completar

O comando pode levar **30-60 segundos** para:
1. Conectar ao banco
2. Aplicar o schema
3. Criar todas as tabelas

**Deixe o comando rodar até o final!**

### Opção 2: Verificar Connection String

Confirme que o `.env` tem a connection string correta:

```env
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### Opção 3: Usar Prisma Migrate (Alternativa)

Se `db push` continuar com problemas, use migrations:

```powershell
npx prisma migrate dev --name init
```

### Opção 4: Criar Tabelas Manualmente via SQL

1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. Vá em **SQL Editor**
4. Execute o SQL gerado pelo Prisma:

```powershell
npx prisma migrate dev --create-only
```

Isso criará um arquivo SQL que você pode executar no Supabase.

### Opção 5: Verificar Conexão

Teste se consegue conectar:

```powershell
npx prisma studio
```

Se o Prisma Studio abrir, a conexão está funcionando!

## 📝 Comando Completo:

```powershell
cd nextjs_space
npx prisma db push --accept-data-loss
```

**Importante:** Deixe o comando completar. Pode demorar, mas deve funcionar!

---

**Se continuar com problemas, use o Prisma Studio para verificar a conexão primeiro.**
