-- Senha: NÃO coloques aqui. A coluna users.password é bcrypt. Opções:
--   • Criar conta em /cadastro (email + senha nos campos do formulário).
--   • Ou na máquina local: MACOFEL_SET_EMAIL=... MACOFEL_SET_PASSWORD=... npm run set-user-password
-- =============================================================================
-- 1) OBRIGATÓRIO: criar os novos valores no enum (senão 'MASTER_ADMIN' dá 22P02)
-- Supabase usa PostgreSQL 15+ → IF NOT EXISTS é suportado.
-- Se o editor acusar erro de sintaxe em IF NOT EXISTS, use em vez disso o ficheiro
-- prisma/migrations/20260320120000_add_user_roles/migration.sql (sem IF NOT EXISTS).
-- =============================================================================
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'LOGISTICS';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EMPLOYEE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SELLER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STORE_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MASTER_ADMIN';

-- =============================================================================
-- 2) Promover o utilizador (tem de já existir em "users" com esse email exato)
-- RETURNING: aparece 1 linha = OK. "Success. No rows returned" aqui = ninguém foi
-- atualizado (email inexistente na tabela). Cria a conta no site (/cadastro) para
-- gravar em "users" — o Auth do Supabase sozinho não preenche esta tabela no Macofel.
-- =============================================================================
UPDATE "users"
SET "role" = 'MASTER_ADMIN'::"UserRole"
WHERE "email" = 'lwdigitalforge@gmail.com'
RETURNING "id", "email", "role";

-- Diagnóstico (corre sozinho no editor se precisares de ver emails na base):
-- SELECT "id", "email", "role" FROM "users" WHERE "email" ILIKE '%lwdigital%';
-- SELECT COUNT(*)::int AS total FROM "users";
