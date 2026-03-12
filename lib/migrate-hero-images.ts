// Script de migração para adicionar campos displayType e animationOrder às imagens antigas
import { connectToDatabase } from './mongodb-native';
import { ObjectId } from 'mongodb';

export async function migrateHeroImages() {
  try {
    const db = await connectToDatabase();
    const heroImagesCollection = db.collection('hero_images');

    // Buscar todas as imagens que não têm displayType ou animationOrder
    const imagesToUpdate = await heroImagesCollection
      .find({
        $or: [
          { displayType: { $exists: false } },
          { animationOrder: { $exists: false } },
        ],
      })
      .toArray();

    console.log(`Encontradas ${imagesToUpdate.length} imagens para migrar`);

    if (imagesToUpdate.length === 0) {
      console.log('Nenhuma imagem precisa ser migrada');
      return { migrated: 0, total: 0 };
    }

    // Atualizar cada imagem
    let migrated = 0;
    for (const image of imagesToUpdate) {
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Adicionar displayType se não existir (padrão: 'grid')
      if (!image.displayType) {
        updateData.displayType = 'grid';
      }

      // Adicionar animationOrder se não existir (padrão: 0)
      if (image.animationOrder === undefined || image.animationOrder === null) {
        updateData.animationOrder = 0;
      }

      // Adicionar campos de link se não existirem
      if (!image.linkType) {
        updateData.linkType = null;
      }
      if (!image.productId) {
        updateData.productId = null;
      }
      if (!image.categorySlug) {
        updateData.categorySlug = null;
      }
      if (!image.linkUrl) {
        updateData.linkUrl = null;
      }

      await heroImagesCollection.updateOne(
        { _id: image._id },
        { $set: updateData }
      );

      migrated++;
      console.log(`✅ Imagem migrada: ${image._id.toString()} - ${image.alt || 'Sem título'}`);
    }

    console.log(`\n✅ Migração concluída: ${migrated} imagens atualizadas`);
    return { migrated, total: imagesToUpdate.length };
  } catch (error) {
    console.error('Erro na migração:', error);
    throw error;
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  migrateHeroImages()
    .then((result) => {
      console.log('Resultado:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro:', error);
      process.exit(1);
    });
}
