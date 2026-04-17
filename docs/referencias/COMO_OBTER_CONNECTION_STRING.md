# 🔧 Como Obter a Connection String Correta do Supabase

## ⚠️ Problema Atual

O erro "Tenant or user not found" indica que a connection string precisa ser copiada **diretamente** do Supabase Dashboard, pois o formato pode variar.

## 📋 Passo a Passo

### 1. Acesse o Supabase Dashboard
- URL: https://app.supabase.com
- Faça login na sua conta
- Selecione o projeto: `vedrmtowoosqxzqxgxpb`

### 2. Obtenha a Connection String
1. No menu lateral, clique em **Settings** (⚙️)
2. Clique em **Database**
3. Role até a seção **Connection string**
4. Selecione a aba **Connection string** (se não estiver selecionada)

### 3. Configure os Parâmetros
- **Type:** URI
- **Source:** Primary Database  
- **Method:** Session Pooler (recomendado para IPv4) ou Direct connection

### 4. Copie a Connection String
- Clique no botão de copiar ao lado da connection string
- A connection string terá o formato:
  ```
  postgresql://postgres.vedrmtowoosqxzqxgxpb:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

### 5. Substitua [YOUR-PASSWORD]
- Substitua `[YOUR-PASSWORD]` pela senha: `LW_Digital_Forge/123`
- **IMPORTANTE:** Se a senha contiver `/`, ela será automaticamente codificada na URL quando você colar no Supabase
- Ou codifique manualmente: `/` vira `%2F`

### 6. Atualize o arquivo .env

Abra `nextjs_space/.env` e substitua a linha `DATABASE_URL` pela connection string copiada, com a senha já inserida.

**Exemplo:**
```env
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### 7. Teste a Conexão

```powershell
cd nextjs_space
npx prisma db push --accept-data-loss
```

## 🔍 Dicas

- **Session Pooler** é recomendado para redes IPv4 (Vercel, GitHub Actions, etc.)
- **Direct connection** funciona melhor em ambientes com IPv6
- A senha será automaticamente codificada quando você colar no campo do Supabase Dashboard
- Se copiar diretamente do dashboard, a connection string já virá com a senha codificada

## ✅ Após Configurar Corretamente

```powershell
cd nextjs_space
npx prisma db push --accept-data-loss
npx prisma db seed
npm run dev
```

---

**A forma mais confiável é copiar a connection string diretamente do Supabase Dashboard!**
