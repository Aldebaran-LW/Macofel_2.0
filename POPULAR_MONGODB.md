# 🌱 Popular MongoDB com Produtos

## ⚠️ Problema

Os produtos não estão aparecendo porque o **MongoDB ainda não foi populado** com dados iniciais.

## ✅ Solução: Executar Seed do MongoDB

### Opção 1: Localmente (Desenvolvimento)

```powershell
cd nextjs_space
npm run seed-mongodb
```

**O que faz:**
- Limpa produtos e categorias existentes no MongoDB
- Cria 6 categorias
- Cria 20 produtos com imagens CDN
- Mostra resumo final

**Tempo estimado:** 5-10 segundos

### Opção 2: Via Vercel (Produção)

O MongoDB precisa ser populado **manualmente** na primeira vez, pois o seed não roda automaticamente no deploy.

#### Passo 1: Executar Localmente com Variáveis de Produção

1. Copie as variáveis de ambiente do Vercel:
   - `MONGODB_URI`
   - `DATABASE_URL`
   - Outras variáveis necessárias

2. Crie um arquivo `.env.local` com essas variáveis

3. Execute:
```powershell
cd nextjs_space
npm run seed-mongodb
```

#### Passo 2: Ou usar MongoDB Compass/Atlas

1. Acesse: https://cloud.mongodb.com
2. Conecte ao cluster
3. Use o script `seed-mongodb.ts` como referência
4. Insira os dados manualmente

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

**Execute `npm run seed-mongodb` agora!** 🚀
