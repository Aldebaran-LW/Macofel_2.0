// Script para criar a categoria "Materiais Hidráulicos"
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const dbName = 'test';

async function createCategory() {
  if (!uri) {
    console.error('MONGODB_URI não está definida');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');

    const db = client.db(dbName);
    const categoriesCollection = db.collection('categories');

    // Verificar se já existe
    const existing = await categoriesCollection.findOne({
      $or: [
        { name: 'Materiais Hidráulicos' },
        { slug: 'materiais-hidraulicos' },
      ],
    });

    if (existing) {
      console.log('⚠️  Categoria "Materiais Hidráulicos" já existe');
      console.log('ID:', existing._id.toString());
      console.log('Nome:', existing.name);
      console.log('Slug:', existing.slug);
      return;
    }

    // Criar categoria
    const result = await categoriesCollection.insertOne({
      name: 'Materiais Hidráulicos',
      slug: 'materiais-hidraulicos',
      description: 'Tubos, conexões, válvulas, registros, torneiras e acessórios hidráulicos',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Categoria criada com sucesso!');
    console.log('ID:', result.insertedId.toString());
    console.log('Nome: Materiais Hidráulicos');
    console.log('Slug: materiais-hidraulicos');
  } catch (error) {
    console.error('❌ Erro ao criar categoria:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createCategory();
