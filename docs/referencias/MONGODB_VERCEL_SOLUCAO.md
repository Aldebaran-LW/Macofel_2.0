# 🔧 Solução: MongoDB Connection String da Vercel

## ✅ Você está correto!

A connection string fornecida pela Vercel **não vem com nome do banco**:
```
mongodb+srv://...@...mongodb.net/?retryWrites=true&w=majority
```

## ⚠️ Mas o Prisma precisa do nome do banco!

Quando populamos o MongoDB localmente, usamos o banco `macofel`. Então precisamos **adicionar manualmente** o nome do banco na connection string.

## ✅ Solução: Adicionar nome do banco manualmente

### Opção 1: Adicionar `/macofel` na connection string

No Vercel, edite `MONGODB_URI` e adicione `/macofel` antes do `?`:

**Original (da Vercel):**
```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority"
```

**Corrigida (com nome do banco):**
```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/macofel?retryWrites=true&w=majority"
```

**Diferença:** Adicione `/macofel` antes do `?`

### Opção 2: Verificar qual banco existe no MongoDB Atlas

1. Acesse: https://cloud.mongodb.com
2. Vá em **Browse Collections**
3. Veja qual banco de dados tem as collections `products` e `categories`
4. Use esse nome na connection string

### Opção 3: Usar banco padrão (se não especificar)

Se você não especificar o nome do banco, o MongoDB pode usar um banco padrão. Mas o Prisma pode ter problemas.

## 🎯 Recomendação

**Use a Opção 1** - adicione `/macofel` manualmente na connection string do Vercel, pois foi esse o banco que populamos localmente.

## 📋 Passos no Vercel

1. Acesse: https://vercel.com/dashboard
2. Projeto: **materiais-de-construção**
3. **Settings** > **Environment Variables**
4. Encontre: `MONGODB_URI`
5. **Edite** e adicione `/macofel` antes do `?`
6. **Salve**
7. **Redeploy**

## 🔍 Verificar se funcionou

Após o redeploy:
1. Acesse: https://materiais-de-construcao.vercel.app/catalogo
2. Abra DevTools (F12) > Console
3. Não deve haver mais erros 500
4. Produtos devem aparecer!

---

**A connection string da Vercel está correta, mas precisa do nome do banco adicionado manualmente!** ✅
