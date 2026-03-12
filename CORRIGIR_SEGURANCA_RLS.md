# 🔒 Corrigir Segurança RLS - Guia Completo

## ⚠️ Problema Identificado

O Supabase está mostrando avisos críticos de segurança:
- **RLS (Row Level Security) desabilitado** em várias tabelas
- Isso permite que qualquer pessoa acesse os dados via Data API
- **Risco de segurança crítico!**

## ✅ Solução: Habilitar RLS e Criar Políticas

### 📋 O Que Fazer:

1. **Acesse o Supabase Dashboard**
   - URL: https://app.supabase.com
   - Projeto: `Materiais_de_Construção`

2. **Vá para SQL Editor**
   - Menu lateral > **SQL Editor**

3. **Execute o Script**
   - Abra o arquivo: `enable-rls-policies.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor
   - Clique em **Run** (ou pressione `Ctrl + Enter`)

4. **Verifique os Resultados**
   - Deve aparecer: "Success. No rows returned"
   - Os avisos de segurança devem desaparecer

## 🎯 O Que o Script Faz:

### 1. Habilita RLS em Todas as Tabelas:
- ✅ `accounts`
- ✅ `cart_items`
- ✅ `carts`
- ✅ `categories`
- ✅ `order_items`
- ✅ `orders`
- ✅ `products`
- ✅ `sessions`
- ✅ `users`
- ✅ `verification_tokens`

### 2. Cria Políticas de Segurança:

#### **Produtos e Categorias (Público pode ler):**
- ✅ Qualquer um pode **ler** produtos e categorias (para o catálogo funcionar)
- ✅ Apenas **service role** pode criar/editar/deletar (via Prisma)

#### **Dados Sensíveis (Apenas service role):**
- ✅ `users` - Apenas service role
- ✅ `accounts` - Apenas service role
- ✅ `sessions` - Apenas service role
- ✅ `carts` - Apenas service role
- ✅ `cart_items` - Apenas service role
- ✅ `orders` - Apenas service role
- ✅ `order_items` - Apenas service role
- ✅ `verification_tokens` - Apenas service role

## 🔐 Como Funciona:

### Service Role:
- A aplicação usa **Service Role Key** via `DATABASE_URL`
- O Prisma conecta com privilégios de **service_role**
- Isso permite que a aplicação acesse tudo normalmente

### Público (Anon):
- Pode apenas **ler** produtos e categorias
- **Não pode** modificar nada
- **Não pode** acessar dados sensíveis

## ✅ Resultado Esperado:

Após executar o script:

1. ✅ **RLS habilitado** em todas as tabelas
2. ✅ **Avisos de segurança desaparecem**
3. ✅ **Aplicação continua funcionando** normalmente
4. ✅ **Catálogo público** continua acessível
5. ✅ **Dados sensíveis protegidos**

## 🧪 Testar:

### 1. Verificar RLS Habilitado:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'categories', 'users', 'orders');
```

Deve retornar `rowsecurity = true` para todas.

### 2. Verificar Políticas:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Deve mostrar todas as políticas criadas.

### 3. Testar Aplicação:
- ✅ Acesse o catálogo: `/catalogo`
- ✅ Produtos devem aparecer normalmente
- ✅ Login deve funcionar
- ✅ Admin deve funcionar

## ⚠️ Importante:

- **A aplicação continua funcionando normalmente** porque usa Service Role
- **O catálogo público continua acessível** (produtos e categorias)
- **Dados sensíveis estão protegidos** (users, orders, etc.)
- **Não precisa mudar nada no código**

## 🚨 Se Algo Der Errado:

### Reverter (Desabilitar RLS):
```sql
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
-- ... (repita para outras tabelas)
```

### Remover Políticas:
```sql
DROP POLICY "Produtos são públicos para leitura" ON public.products;
DROP POLICY "Apenas service role pode modificar produtos" ON public.products;
-- ... (repita para outras políticas)
```

## 📝 Notas:

- O RLS **não afeta** a aplicação porque ela usa Service Role
- O RLS **protege** contra acesso direto via Supabase Data API
- É uma **camada extra de segurança** recomendada
- O Supabase **recomenda** sempre habilitar RLS

---

**Execute o script `enable-rls-policies.sql` no Supabase SQL Editor para corrigir os avisos de segurança!** 🔒
