# 🔧 Solução: MongoDB Vercel sem Alterar Connection String

## ✅ Entendido!

A connection string fornecida pela Vercel **não pode ser alterada diretamente**, mas podemos **adicionar o nome do banco na variável de ambiente**.

## 🎯 Solução: Editar a Variável no Vercel

Mesmo que a connection string original não tenha o nome do banco, você pode **editar a variável `MONGODB_URI` no Vercel** e adicionar o nome do banco manualmente.

### Passo a Passo:

1. **Acesse:** https://vercel.com/dashboard
2. **Projeto:** materiais-de-construção
3. **Settings** > **Environment Variables**
4. **Encontre:** `MONGODB_URI`
5. **Clique em:** **Edit** (ou os três pontos)
6. **Adicione `/macofel`** antes do `?` na connection string:

**Connection string original (da Vercel):**
```
mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority
```

**Edite para (adicione `/macofel` antes do `?`):**
```
mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/macofel?retryWrites=true&w=majority
```

7. **Salve** a variável
8. **Redeploy** o projeto

## 🔍 Alternativa: Verificar Banco no MongoDB Atlas

Se não souber qual banco usar, verifique no MongoDB Atlas:

1. Acesse: https://cloud.mongodb.com
2. Vá em **Browse Collections**
3. Veja qual banco de dados tem as collections:
   - `products`
   - `categories`
4. Use esse nome na connection string

## 📋 Se o Banco Não Existir

Se o banco `macofel` não existir no MongoDB Atlas da Vercel:

### Opção 1: Criar o banco populando localmente

1. Use a connection string da Vercel (sem nome do banco)
2. Execute localmente com essa connection string:
   ```powershell
   cd nextjs_space
   # Adicione a connection string da Vercel no .env
   npm run seed-mongodb
   ```
3. Isso criará o banco `macofel` automaticamente

### Opção 2: Usar banco padrão

Se não especificar o nome do banco, o MongoDB pode usar um banco padrão. Mas o Prisma pode ter problemas.

## ✅ Recomendação Final

**Edite a variável `MONGODB_URI` no Vercel** e adicione `/macofel` manualmente antes do `?`. Isso não altera a connection string original, apenas a variável de ambiente que o Vercel usa.

---

**Você pode editar a variável de ambiente mesmo que a connection string original não tenha o nome do banco!** ✅
