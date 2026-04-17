# 🔧 Troubleshooting - Erros 500 nas APIs

## ❌ Problema: Erros 500 em `/api/categories` e `/api/products`

### Possíveis Causas:

1. **DATABASE_URL não configurada na Vercel**
2. **Prisma Client não gerado no build**
3. **Conexão com banco falhando**

## ✅ Soluções:

### 1. Verificar Variáveis de Ambiente na Vercel

1. Acesse: https://vercel.com
2. Seu projeto > **Settings** > **Environment Variables**
3. Verifique se `DATABASE_URL` está configurada:

```
DATABASE_URL=postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**IMPORTANTE:**
- ✅ Deve estar aplicada para **Production**, **Preview** e **Development**
- ✅ A senha deve estar codificada (`%2F` para `/`)

### 2. Verificar Logs do Build na Vercel

1. Vá em **Deployments**
2. Clique no último deploy
3. Veja os logs de build
4. Procure por:
   - `prisma generate` - deve aparecer
   - Erros de conexão com banco
   - Erros de Prisma Client

### 3. Verificar Console do Navegador

Abra o DevTools (F12) e veja:
- Mensagens de erro detalhadas
- Status das requisições
- Detalhes do erro 500

### 4. Testar Conexão Localmente

```powershell
cd nextjs_space
npm run dev
```

Acesse: http://localhost:3000/catalogo

Se funcionar localmente, o problema é na Vercel (variáveis de ambiente).

### 5. Verificar Prisma Client

O Prisma Client deve ser gerado automaticamente no build via:
- `postinstall` script no `package.json`
- `vercel-build` script

Verifique se está funcionando nos logs do build.

## 🔍 Debug Adicional

### Verificar se o Banco Tem Dados

Execute no Supabase SQL Editor:

```sql
SELECT COUNT(*) FROM categories;
SELECT COUNT(*) FROM products;
```

Se retornar 0, execute o seed:

```powershell
npx prisma db seed
```

### Verificar Connection String

Teste a connection string diretamente:

```powershell
# No Supabase Dashboard > Settings > Database > Connection string
# Copie a connection string e teste
```

## ✅ Correções Aplicadas

- ✅ Melhor tratamento de erros nas APIs
- ✅ Logs detalhados para debug
- ✅ Mensagens de erro mais informativas

## 📝 Próximos Passos

1. **Verifique as variáveis de ambiente na Vercel**
2. **Faça um novo deploy** após configurar
3. **Verifique os logs** do novo deploy
4. **Teste o catálogo** novamente

---

**O problema mais comum é a DATABASE_URL não estar configurada na Vercel!**
