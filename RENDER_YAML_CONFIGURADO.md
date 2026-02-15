# ✅ render.yaml Configurado com Variáveis de Ambiente

## 📋 O Que Foi Feito

Todas as variáveis de ambiente foram incluídas diretamente no `render.yaml` com os valores corretos.

## 🔧 Variáveis Configuradas

### 1. **NODE_ENV**
```yaml
- key: NODE_ENV
  value: production
```

### 2. **MONGODB_URI** (MongoDB Atlas)
```yaml
- key: MONGODB_URI
  value: mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority
```

### 3. **DATABASE_URL** (Supabase PostgreSQL)
```yaml
- key: DATABASE_URL
  value: postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 4. **NEXTAUTH_URL**
```yaml
- key: NEXTAUTH_URL
  value: https://materiais-de-construcao.onrender.com
```
⚠️ **IMPORTANTE:** Atualize após o deploy com a URL real do Render!

### 5. **NEXTAUTH_SECRET**
```yaml
- key: NEXTAUTH_SECRET
  value: HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```

### 6. **NEXT_PUBLIC_SUPABASE_URL**
```yaml
- key: NEXT_PUBLIC_SUPABASE_URL
  value: https://vedrmtowoosqxzqxgxpb.supabase.co
```

### 7. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
```yaml
- key: NEXT_PUBLIC_SUPABASE_ANON_KEY
  value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```

### 8. **SUPABASE_SERVICE_ROLE_KEY**
```yaml
- key: SUPABASE_SERVICE_ROLE_KEY
  value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

## 🚀 Como Usar

### Opção 1: Deploy Automático (Recomendado)

1. **Faça commit do `render.yaml`:**
```bash
git add render.yaml
git commit -m "Configurar variáveis de ambiente no render.yaml"
git push
```

2. **No Render Dashboard:**
   - Conecte o repositório GitHub
   - Render detecta automaticamente o `render.yaml`
   - Todas as variáveis serão aplicadas automaticamente

### Opção 2: Deploy Manual

1. **Crie o serviço no Render:**
   - New > Web Service
   - Conecte repositório

2. **Render aplica automaticamente:**
   - Lê o `render.yaml`
   - Configura todas as variáveis
   - Faz o deploy

## ⚠️ Importante: Atualizar NEXTAUTH_URL

Após o primeiro deploy, você receberá uma URL do Render (ex: `https://materiais-de-construcao-abc123.onrender.com`).

**Atualize o `render.yaml` com a URL real:**

```yaml
- key: NEXTAUTH_URL
  value: https://SUA-URL-REAL.onrender.com
```

Ou atualize diretamente no Render Dashboard:
- Settings > Environment
- Edite `NEXTAUTH_URL`
- Salve

## 🔐 Segurança

### ⚠️ Atenção:

O `render.yaml` contém **credenciais sensíveis**:
- Senhas de banco de dados
- Chaves secretas
- Tokens de API

### ✅ Boas Práticas:

1. **NÃO faça commit de senhas em produção**
2. **Use variáveis de ambiente no Render Dashboard** (mais seguro)
3. **Ou use Render Secrets** para valores sensíveis

### 🔒 Alternativa Mais Segura:

Se preferir não ter credenciais no código:

1. **Remova os valores do `render.yaml`:**
```yaml
- key: DATABASE_URL
  sync: false  # Configure manualmente no Dashboard
```

2. **Configure manualmente no Render Dashboard:**
   - Settings > Environment
   - Adicione cada variável
   - Render não expõe no código

## ✅ Vantagens de Ter no render.yaml

- ✅ **Deploy automático** - Tudo configurado
- ✅ **Versionamento** - Variáveis no Git
- ✅ **Reproduzível** - Mesma config em qualquer ambiente
- ✅ **Fácil de atualizar** - Edite e faça commit

## 📝 Checklist

Antes de fazer deploy:

- [x] Todas as variáveis no `render.yaml`
- [ ] Commit do `render.yaml`
- [ ] Repositório conectado no Render
- [ ] Após deploy: Atualizar `NEXTAUTH_URL` com URL real
- [ ] Testar aplicação no Render

---

**Todas as variáveis estão configuradas no `render.yaml`! Pronto para deploy!** 🚀
