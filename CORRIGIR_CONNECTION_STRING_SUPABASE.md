# 🔧 Corrigir Connection String do Supabase

## ⚠️ Erro Detectado

```
FATAL: Locatário ou usuário não encontrado
```

Este erro indica que a **connection string do Supabase está incorreta** no Vercel.

## ✅ Solução: Obter Connection String Correta

### Passo 1: Acessar Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Faça login
3. Selecione o projeto: `vedrmtowoosqxzqxgxpb`

### Passo 2: Obter Connection String

1. Vá em **Settings** (⚙️) > **Database**
2. Role até a seção **Connection string**
3. Configure:
   - **Type:** URI
   - **Mode:** Session Pooler (recomendado para IPv4)
   - **Source:** Primary Database

### Passo 3: Copiar Connection String

A connection string terá o formato:

```
postgresql://postgres.vedrmtowoosqxzqxgxpb:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Passo 4: Obter a Senha do Banco

1. No mesmo painel **Settings** > **Database**
2. Role até **Database password**
3. Se você não souber a senha:
   - Clique em **Reset database password**
   - Copie a nova senha
   - ⚠️ **IMPORTANTE:** Você precisará atualizar todos os lugares que usam essa senha

### Passo 5: Substituir [YOUR-PASSWORD]

Na connection string copiada, substitua `[YOUR-PASSWORD]` pela senha real do banco.

**Se a senha contiver caracteres especiais (como `/`), você precisa codificá-los:**
- `/` vira `%2F`
- `@` vira `%40`
- `#` vira `%23`
- etc.

**Exemplo:**
- Senha: `LW_Digital_Forge/123`
- Senha codificada: `LW_Digital_Forge%2F123`

### Passo 6: Atualizar no Vercel

1. Acesse: https://vercel.com
2. Projeto: `materiais-de-construcao`
3. Vá em **Settings** > **Environment Variables**
4. Encontre `DATABASE_URL`
5. Clique nos **3 pontos** > **Edit**
6. Cole a connection string completa com a senha já inserida
7. Marque para: **Production**, **Preview**, **Development**
8. Clique em **Save**

### Passo 7: Fazer Redeploy

1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Selecione **Redeploy**
4. Aguarde o deploy concluir

## 🔍 Verificar se Funcionou

Após o redeploy, teste novamente:

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

## 📋 Formato Correto da Connection String

**Session Pooler (Recomendado):**
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:SENHA_CODIFICADA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Direct Connection (Alternativa):**
```
postgresql://postgres:SENHA_CODIFICADA@db.vedrmtowoosqxzqxgxpb.supabase.co:5432/postgres
```

## ⚠️ Dicas Importantes

1. **Sempre use Session Pooler** para IPv4 (Vercel usa IPv4)
2. **Codifique caracteres especiais** na senha
3. **Copie a connection string diretamente** do Supabase Dashboard
4. **Não use** connection strings antigas ou de outros projetos

## 🛠️ Troubleshooting

### Ainda dá erro após atualizar?

1. **Verifique se a senha está correta:**
   - Tente resetar a senha no Supabase
   - Use a nova senha na connection string

2. **Verifique se está usando Session Pooler:**
   - Deve usar porta `6543`
   - Deve ter `?pgbouncer=true` no final

3. **Teste a connection string localmente:**
   - Atualize o `.env` local
   - Execute: `npm run test-all`
   - Se funcionar localmente, o problema é no Vercel

---

**O erro deve ser resolvido após atualizar a connection string correta no Vercel!**
