# 🌱 Popular MongoDB Atlas da Vercel

## ✅ Connection String Correta

A connection string fornecida pela Vercel está **correta**:
```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority"
```

## ⚠️ Problema Real

O MongoDB Atlas da Vercel **não foi populado** com produtos e categorias. O seed foi executado apenas **localmente**.

## ✅ Solução: Popular o MongoDB Atlas da Vercel

### Opção 1: Executar Seed Localmente com Connection String da Vercel

1. **Copie a connection string da Vercel:**
   ```
   mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority
   ```

2. **Atualize o `.env` local:**
   ```powershell
   cd nextjs_space
   # Edite o arquivo .env e substitua MONGODB_URI pela connection string da Vercel
   ```

3. **Execute o seed:**
   ```powershell
   npm run seed-mongodb
   ```

4. **Isso populará o MongoDB Atlas da Vercel** com:
   - 6 categorias
   - 21 produtos

### Opção 2: Popular via MongoDB Atlas Dashboard

1. **Acesse:** https://cloud.mongodb.com
2. **Conecte ao cluster:** materiais-de-construcao
3. **Vá em:** Browse Collections
4. **Crie manualmente** as collections `products` e `categories`
5. **Insira os dados** usando o script `seed-mongodb.ts` como referência

### Opção 3: Usar MongoDB Compass

1. **Instale:** MongoDB Compass
2. **Conecte** usando a connection string da Vercel
3. **Importe** os dados do seed local

## 📋 Após Popular

1. **Verifique no MongoDB Atlas:**
   - Acesse: https://cloud.mongodb.com
   - Vá em Browse Collections
   - Deve ver `products` e `categories` com dados

2. **Redeploy no Vercel:**
   - O Vercel já tem a connection string correta
   - Faça um redeploy ou aguarde o próximo deploy automático

3. **Teste:**
   - Acesse: https://materiais-de-construcao.vercel.app/catalogo
   - Produtos devem aparecer!

## 🔍 Verificar Qual Banco Foi Criado

Quando você executa o seed sem especificar o nome do banco, o MongoDB pode:
- Usar um banco padrão (geralmente `test`)
- Ou criar um banco baseado na connection string

Para verificar:
1. Acesse: https://cloud.mongodb.com
2. Vá em Browse Collections
3. Veja qual banco tem as collections `products` e `categories`

## ✅ Recomendação

**Use a Opção 1** - execute o seed localmente com a connection string da Vercel. Isso é mais rápido e garante que os dados sejam populados corretamente.

---

**A connection string está correta! O problema é que o MongoDB Atlas da Vercel precisa ser populado.** 🌱
