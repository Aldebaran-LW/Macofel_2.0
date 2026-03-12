import { connectToDatabase, createHeroImage } from '../lib/mongodb-native';

const defaultHeroImages = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1000',
    alt: 'Obra de Engenharia 1',
    order: 0,
    active: true,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1000',
    alt: 'Obra de Engenharia 2',
    order: 1,
    active: true,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000',
    alt: 'Obra de Engenharia 3',
    order: 2,
    active: true,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&q=80&w=1000',
    alt: 'Obra de Engenharia 4',
    order: 3,
    active: true,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1000',
    alt: 'Obra de Engenharia 5',
    order: 4,
    active: true,
  },
];

async function main() {
  try {
    console.log('🌱 Iniciando seed de imagens do hero...');
    
    await connectToDatabase();
    console.log('✅ Conectado ao MongoDB');

    // Verificar se já existem imagens
    const { getAllHeroImages } = await import('../lib/mongodb-native');
    const existingImages = await getAllHeroImages();
    
    if (existingImages.length > 0) {
      console.log(`⚠️  Já existem ${existingImages.length} imagens no banco. Pulando seed.`);
      console.log('💡 Para recriar as imagens, delete-as primeiro pelo painel admin.');
      return;
    }

    console.log('📸 Criando imagens padrão do hero...');
    
    for (const image of defaultHeroImages) {
      await createHeroImage(image);
      console.log(`✅ Imagem criada: ${image.alt}`);
    }

    console.log('🎉 Seed de imagens do hero concluído!');
  } catch (error) {
    console.error('❌ Erro ao fazer seed de imagens do hero:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
