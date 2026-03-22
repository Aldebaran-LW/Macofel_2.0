# 🌱 MongoDB — catálogo

## ⚠️ Produção (site canónico + PDV)

O catálogo **real** da loja fica no **MongoDB** e deve ser mantido no **Painel Admin** (`/admin/produtos`).  
É a **mesma base** que o site e o PDV consomem — não dependas de produtos “de mentira” para clientes.

O script `seed-mongodb` recria **apenas dados de demonstração** (fictícios). **Não o uses** em produção após a loja estar no ar, salvo reset consciente de ambiente de testes.

## Seed demo (só desenvolvimento / reset local)

Os produtos não aparecem em **dev** quando o MongoDB está vazio. Aí pode fazer seed **demo** com confirmação explícita:

```powershell
cd "Macofel 2.0"
$env:ALLOW_SEED_MONGODB_DEMO='true'
npm run seed-mongodb
```

**O que faz:**
- Limpa produtos e categorias existentes no MongoDB
- Cria 6 categorias
- Cria ~20 produtos fictícios com imagens CDN
- Mostra resumo final

Sem `ALLOW_SEED_MONGODB_DEMO=true` o comando **falha de propósito** para não apagar o catálogo real por engano.

**Tempo estimado:** 5-10 segundos

### Primeira vez em produção

1. **Preferível:** criar categorias e produtos reais no **Admin** (`/admin/produtos` e `/admin/categorias`), alinhados ao stock e preços da loja (e ao que o PDV sincroniza).
2. **Só se quiser um vazio inicial para preencher depois:** não rode o seed demo na base de produção.
3. **Bootstrap rápido com dados fictícios** (útil em ambiente de teste, não para loja aberta ao público): na máquina local com `.env` apontando ao cluster, use `ALLOW_SEED_MONGODB_DEMO=true npm run seed-mongodb` — **apaga** o catálogo atual.

#### MongoDB Compass / Atlas

Pode importar ou editar documentos manualmente em `products` / `categories`; use `seed-mongodb.ts` só como **referência de campos**, não como rotina em produção.

## 📋 O que será criado:

### Categorias (6):
- Cimento e Argamassa
- Tijolos e Blocos
- Tintas e Acessórios
- Ferramentas
- Material Hidráulico
- Material Elétrico

### Produtos (20):
- 4 produtos de Cimento e Argamassa
- 4 produtos de Tijolos e Blocos
- 4 produtos de Tintas e Acessórios
- 3 produtos de Ferramentas
- 3 produtos de Material Hidráulico
- 3 produtos de Material Elétrico

## ✅ Verificar se Funcionou:

### 1. Testar API Localmente:

```powershell
# Iniciar servidor
npm run dev

# Em outro terminal, testar API
curl http://localhost:3000/api/products
```

Deve retornar JSON com produtos.

### 2. Verificar no MongoDB Atlas:

1. Acesse: https://cloud.mongodb.com
2. Vá em **Browse Collections**
3. Deve ver:
   - Collection `products` com 20 documentos
   - Collection `categories` com 6 documentos

### 3. Testar no Site:

1. Acesse: http://localhost:3000/catalogo
2. Produtos devem aparecer!

## 🔧 Troubleshooting:

### Erro: "Cannot find module '../.prisma/mongodb-client'"

Execute primeiro:
```powershell
npm run prisma:generate
```

### Erro: "MongoServerError: Authentication failed"

Verifique a `MONGODB_URI` no `.env`:
- Deve ter usuário e senha corretos
- Formato: `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/...`

### Erro: "Connection timeout"

- Verifique se o IP está liberado no MongoDB Atlas
- Vá em **Network Access** e adicione `0.0.0.0/0` (temporário) ou seu IP

## 🎯 Após Popular:

✅ Produtos aparecerão no catálogo
✅ Categorias aparecerão no filtro
✅ Página inicial mostrará produtos em destaque

---

Em **produção canónica**, trate o catálogo como **dados reais**; o seed demo é só para dev ou laboratório, com `ALLOW_SEED_MONGODB_DEMO=true`.
