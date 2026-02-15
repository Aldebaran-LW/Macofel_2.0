# ✅ MongoDB Atlas Populado - Atualizar Vercel

## 🎉 Seed Concluído!

O MongoDB Atlas da Vercel foi populado com sucesso:
- ✅ 6 categorias
- ✅ 21 produtos
- ✅ Banco: `test`

## ⚠️ Importante: Atualizar Connection String no Vercel

A connection string no Vercel precisa incluir o nome do banco `/test` para o Prisma funcionar.

### Connection String para o Vercel:

**Original (da Vercel - sem nome do banco):**
```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority"
```

**Atualizada (com nome do banco `/test`):**
```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/test?retryWrites=true&w=majority"
```

**Diferença:** Adicione `/test` antes do `?`

## 📋 Passos no Vercel

1. **Acesse:** https://vercel.com/dashboard
2. **Projeto:** materiais-de-construção
3. **Settings** > **Environment Variables**
4. **Encontre:** `MONGODB_URI`
5. **Edite** e adicione `/test` antes do `?`
6. **Salve**
7. **Redeploy**

## ✅ Após Atualizar

1. Aguarde o deploy completar (2-3 minutos)
2. Acesse: https://materiais-de-construcao.vercel.app/catalogo
3. Produtos devem aparecer!

## 🔍 Verificar no MongoDB Atlas

1. Acesse: https://cloud.mongodb.com
2. Vá em **Browse Collections**
3. Selecione o banco **test**
4. Deve ver:
   - Collection `products` com 21 documentos
   - Collection `categories` com 6 documentos

---

**Atualize a connection string no Vercel com `/test` e faça redeploy!** 🚀
