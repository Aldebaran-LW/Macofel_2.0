// Script para migrar produtos e categorias do Supabase para MongoDB
// @ts-nocheck
// @ts-ignore
import { PrismaClient as PostgresPrisma } from '../.prisma/postgres-client';
// @ts-ignore
import { PrismaClient as MongoPrisma } from '../node_modules/.prisma-mongodb';
import dotenv from 'dotenv';

dotenv.config();

const postgresPrisma = new PostgresPrisma();
const mongoPrisma = new MongoPrisma();

async function migrate() {
  console.log('🚀 Iniciando migração para MongoDB...\n');

  try {
    // 1. Migrar Categorias
    console.log('📦 Migrando categorias...');
    const categories = await postgresPrisma.category.findMany();
    
    for (const category of categories) {
      try {
        await mongoPrisma.category.upsert({
          where: { slug: category.slug },
          update: {
            name: category.name,
            description: category.description,
            updatedAt: new Date(),
          },
          create: {
            name: category.name,
            slug: category.slug,
            description: category.description,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          },
        });
        console.log(`  ✅ Categoria: ${category.name}`);
      } catch (error: any) {
        console.error(`  ❌ Erro ao migrar categoria ${category.name}:`, error.message);
      }
    }

    // 2. Migrar Produtos
    console.log('\n📦 Migrando produtos...');
    const products = await postgresPrisma.product.findMany({
      include: { category: true },
    });

    const categoryMap = new Map<string, string>();
    const mongoCategories = await mongoPrisma.category.findMany();
    mongoCategories.forEach((cat) => {
      categoryMap.set(cat.slug, cat.id);
    });

    for (const product of products) {
      try {
        const categoryId = categoryMap.get(product.category.slug);
        if (!categoryId) {
          console.error(`  ⚠️ Categoria não encontrada para produto: ${product.name}`);
          continue;
        }

        await mongoPrisma.product.upsert({
          where: { slug: product.slug },
          update: {
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            imageUrl: product.imageUrl,
            featured: product.featured,
            updatedAt: new Date(),
          },
          create: {
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            stock: product.stock,
            imageUrl: product.imageUrl,
            categoryId: categoryId,
            featured: product.featured,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          },
        });
        console.log(`  ✅ Produto: ${product.name}`);
      } catch (error: any) {
        console.error(`  ❌ Erro ao migrar produto ${product.name}:`, error.message);
      }
    }

    console.log('\n✅ Migração concluída!');
    console.log(`\n📊 Resumo:`);
    console.log(`   - ${await mongoPrisma.category.count()} categorias no MongoDB`);
    console.log(`   - ${await mongoPrisma.product.count()} produtos no MongoDB`);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  } finally {
    await postgresPrisma.$disconnect();
    await mongoPrisma.$disconnect();
  }
}

migrate();
