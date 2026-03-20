-- Produtos vivem no MongoDB; cart_items/order_items guardam IDs Mongo como texto.
-- Remove FKs legadas que exigem linha em public.products (Prisma schema antigo).

ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_productId_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";
