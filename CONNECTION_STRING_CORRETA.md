# ✅ Connection String Correta do Supabase

## ⚠️ Problema Identificado

A connection string no Vercel está usando **host e porta incorretos**!

### ❌ Connection String Atual (INCORRETA):
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Problemas:**
- Host: `aws-0-us-east-1` (ERRADO)
- Porta: `6543` (ERRADO para Session Pooler)

### ✅ Connection String Correta (do Supabase Dashboard):
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

**Correto:**
- Host: `aws-1-us-east-2.pooler.supabase.com` ✅
- Porta: `5432` ✅ (Session Pooler usa porta 5432)
- Senha: `LW_Digital_Forge%2F123` ✅ (codificada corretamente)

## 🔧 Como Corrigir no Vercel

### Passo 1: Acessar Vercel

1. Acesse: https://vercel.com
2. Projeto: `materiais-de-construcao`
3. Vá em **Settings** > **Environment Variables**

### Passo 2: Editar DATABASE_URL

1. Encontre `DATABASE_URL`
2. Clique nos **3 pontos** > **Edit**
3. Substitua o valor por:

```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

**IMPORTANTE:**
- Use o host: `aws-1-us-east-2.pooler.supabase.com`
- Use a porta: `5432` (não `6543`)
- A senha já está codificada corretamente: `LW_Digital_Forge%2F123`
- **NÃO** adicione `?pgbouncer=true` no final (Session Pooler não precisa)

### Passo 3: Salvar

1. Marque para: **Production**, **Preview**, **Development**
2. Clique em **Save**

### Passo 4: Fazer Redeploy

1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Selecione **Redeploy**
4. Aguarde o deploy concluir

## 🔍 Verificar se Funcionou

Após o redeploy, teste:

```
https://materiais-de-construcao.vercel.app/api/test-auth?email=admin@macofel.com&password=admin123
```

Deve retornar:
```json
{
  "success": true,
  "dbConnected": true,
  "userExists": true,
  "passwordCorrect": true
}
```

## 📋 Resumo das Diferenças

| Item | ❌ Atual (Errado) | ✅ Correto |
|------|-------------------|------------|
| Host | `aws-0-us-east-1` | `aws-1-us-east-2` |
| Porta | `6543` | `5432` |
| Query String | `?pgbouncer=true` | (sem query string) |

---

**Após atualizar com a connection string correta, o erro deve ser resolvido!**
