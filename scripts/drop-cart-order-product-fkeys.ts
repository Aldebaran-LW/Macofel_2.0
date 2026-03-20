import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_productId_fkey"`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_productId_fkey"`
  );
  console.log('FKs removidas (se existiam).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
