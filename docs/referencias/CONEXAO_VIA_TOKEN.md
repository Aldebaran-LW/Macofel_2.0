# 🔐 Conexão via Token Supabase

## ✅ Cliente Supabase Instalado

O cliente Supabase foi instalado e configurado para uso direto via tokens.

## 📁 Arquivos Criados

- `lib/supabase.ts` - Cliente Supabase configurado
- Tokens configurados no `.env`

## 🔧 Como Usar

### Importar o Cliente

```typescript
import { supabaseAdmin, supabase } from '@/lib/supabase';

// supabaseAdmin - Usa Service Role Key (permissões totais, server-side)
// supabase - Usa Anon Key (client-side, respeita RLS)
```

### Exemplo de Uso

```typescript
// Server-side (com permissões totais)
import { supabaseAdmin } from '@/lib/supabase';

const { data, error } = await supabaseAdmin
  .from('users')
  .select('*');

// Client-side (respeita RLS)
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('products')
  .select('*');
```

## ⚠️ Para Prisma Funcionar

O Prisma **ainda precisa** de uma connection string PostgreSQL tradicional. 

### Solução: Obter Connection String do Dashboard

1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. **Settings** > **Database** > **Connection string**
4. Selecione **Method: Session Pooler**
5. Copie a connection string completa
6. Cole no `.env` substituindo `DATABASE_URL`

**Formato esperado:**
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## 🎯 Alternativa: Usar Apenas Supabase Client

Se não conseguir fazer o Prisma funcionar, você pode:

1. Criar as tabelas manualmente no Supabase Dashboard
2. Usar o cliente Supabase para todas as operações
3. Migrar gradualmente do Prisma para Supabase Client

### Criar Tabelas via Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. Vá em **SQL Editor**
4. Execute o SQL do schema Prisma (convertido)

---

**Status:** Cliente Supabase configurado ✅ | Prisma aguardando connection string correta ⚠️
