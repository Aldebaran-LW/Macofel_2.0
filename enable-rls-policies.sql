-- ============================================
-- HABILITAR RLS E CRIAR POLÍTICAS DE SEGURANÇA
-- ============================================
-- Execute este script no Supabase Dashboard > SQL Editor
-- Isso resolve os avisos de segurança do RLS

-- ============================================
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. POLÍTICAS PARA PRODUTOS (Público pode ler)
-- ============================================

-- Qualquer um pode ver produtos (para o catálogo)
CREATE POLICY "Produtos são públicos para leitura"
ON public.products
FOR SELECT
USING (true);

-- Apenas service role pode inserir/atualizar/deletar
-- (Isso é feito via Prisma com DATABASE_URL)
CREATE POLICY "Apenas service role pode modificar produtos"
ON public.products
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 3. POLÍTICAS PARA CATEGORIAS (Público pode ler)
-- ============================================

-- Qualquer um pode ver categorias
CREATE POLICY "Categorias são públicas para leitura"
ON public.categories
FOR SELECT
USING (true);

-- Apenas service role pode modificar
CREATE POLICY "Apenas service role pode modificar categorias"
ON public.categories
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 4. POLÍTICAS PARA USERS (Apenas service role)
-- ============================================

-- Apenas service role pode acessar users
CREATE POLICY "Apenas service role pode acessar users"
ON public.users
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 5. POLÍTICAS PARA ACCOUNTS (Apenas service role)
-- ============================================

CREATE POLICY "Apenas service role pode acessar accounts"
ON public.accounts
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 6. POLÍTICAS PARA SESSIONS (Apenas service role)
-- ============================================

CREATE POLICY "Apenas service role pode acessar sessions"
ON public.sessions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 7. POLÍTICAS PARA VERIFICATION_TOKENS (Apenas service role)
-- ============================================

CREATE POLICY "Apenas service role pode acessar verification_tokens"
ON public.verification_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 8. POLÍTICAS PARA CARTS (Apenas service role)
-- ============================================

CREATE POLICY "Apenas service role pode acessar carts"
ON public.carts
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 9. POLÍTICAS PARA CART_ITEMS (Apenas service role)
-- ============================================

CREATE POLICY "Apenas service role pode acessar cart_items"
ON public.cart_items
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 10. POLÍTICAS PARA ORDERS (Apenas service role)
-- ============================================

CREATE POLICY "Apenas service role pode acessar orders"
ON public.orders
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 11. POLÍTICAS PARA ORDER_ITEMS (Apenas service role)
-- ============================================

CREATE POLICY "Apenas service role pode acessar order_items"
ON public.order_items
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- CONCLUSÃO
-- ============================================
-- Todas as tabelas agora têm RLS habilitado
-- Produtos e categorias são públicos para leitura (catálogo)
-- Todas as outras tabelas são protegidas (apenas service role)
-- A aplicação continua funcionando normalmente via Prisma
