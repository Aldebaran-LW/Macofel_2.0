import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Dados antigos removidos');

  // Criar usuários
  const hashedPassword1 = await bcrypt.hash('johndoe123', 10);
  const hashedPassword2 = await bcrypt.hash('admin123', 10);
  const hashedPassword3 = await bcrypt.hash('cliente123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'john@doe.com',
      password: hashedPassword1,
      firstName: 'John',
      lastName: 'Doe',
      phone: '(11) 98888-8888',
      address: 'Rua Admin, 100 - São Paulo/SP',
      role: 'ADMIN',
    },
  });

  const adminMacofel = await prisma.user.create({
    data: {
      email: 'admin@macofel.com',
      password: hashedPassword2,
      firstName: 'Admin',
      lastName: 'MACOFEL',
      phone: '(11) 3333-3333',
      address: 'Sede MACOFEL - São Paulo/SP',
      role: 'ADMIN',
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      email: 'cliente@teste.com',
      password: hashedPassword3,
      firstName: 'Cliente',
      lastName: 'Teste',
      phone: '(11) 99999-9999',
      address: 'Rua Teste, 123 - São Paulo/SP',
      role: 'CLIENT',
    },
  });

  console.log('✅ Usuários criados');

  // Mapeamento de imagens CDN
  const productImages: Record<string, string> = {
    'Cimento CP II 50kg': 'https://cdn.abacus.ai/images/da65f37a-0a16-4919-9373-df7cc1f449cd.png',
    'Argamassa AC-II 20kg': 'https://cdn.abacus.ai/images/ac58840c-ddd0-4105-aae5-21dab05e4c15.png',
    'Cimento CP III 50kg': 'https://cdn.abacus.ai/images/d3f852b1-11be-4211-9ad0-987b3a50950d.png',
    'Argamassa colante AC-III 20kg': 'https://cdn.abacus.ai/images/011c8c92-80ed-44dd-9c77-87ed1e3256e6.png',
    'Tijolo baiano 6 furos': 'https://cdn.abacus.ai/images/7da9160c-4643-43e9-8627-de213decaee4.png',
    'Bloco de concreto 14x19x39cm': 'https://cdn.abacus.ai/images/886f364f-6e2e-4579-8e85-c1ffa296e559.png',
    'Tijolo refratário': 'https://cdn.abacus.ai/images/2dd838e2-b426-46ba-ac7c-f03889aae081.png',
    'Bloco de concreto canaleta': 'https://cdn.abacus.ai/images/85ab54d3-6819-4abd-8986-fa6f93f0e77f.png',
    'Tinta látex branca 18L': 'https://cdn.abacus.ai/images/ec0a514f-b6d7-473c-a156-f8f5d855b84c.png',
    'Tinta acrílica premium branca 3.6L': 'https://cdn.abacus.ai/images/d27bcdab-957b-40f7-88df-72ea079a6791.png',
    'Rolo de pintura profissional': 'https://cdn.abacus.ai/images/fdfc386f-b400-4b32-80b2-45eea47b8da0.png',
    'Pincel para pintura 3 polegadas': 'https://cdn.abacus.ai/images/cd3e4364-39d8-40b5-8352-8a4f0553735a.png',
    'Martelo de unha profissional': 'https://cdn.abacus.ai/images/b98b9387-1f19-4791-ac0c-807eb1c9fdde.png',
    'Furadeira de impacto elétrica': 'https://cdn.abacus.ai/images/b2728513-1609-4a6a-ae57-b6203902de92.png',
    'Kit chave de fenda e Phillips': 'https://cdn.abacus.ai/images/0d49ce92-560e-4a65-9334-133972af6f13.png',
    'Registro de gaveta 3/4"': 'https://cdn.abacus.ai/images/f738ec42-a864-4d35-9ee6-80043d0fbc4a.png',
    'Tubo PVC esgoto 100mm 6m': 'https://cdn.abacus.ai/images/0f69c9bb-88b2-4517-b167-ad22dd2188b1.png',
    'Torneira para pia cromada': 'https://cdn.abacus.ai/images/f17fb154-c73b-448f-b936-5cb7c01364a1.png',
    'Fio elétrico flexível 2.5mm rolo 100m': 'https://cdn.abacus.ai/images/d76df019-8d1c-4742-8114-a391f9566f1d.png',
    'Disjuntor bipolar 32A': 'https://cdn.abacus.ai/images/ae147892-78a8-46d2-b11c-4f956775a3b2.png',
    'Tomada 2P+T 10A padrão novo': 'https://cdn.abacus.ai/images/d0222312-484f-4606-97b5-11c2c4e2477c.png',
  };

  // Criar categorias
  const categories = [
    {
      name: 'Cimento e Argamassa',
      slug: 'cimento-argamassa',
      description: 'Cimentos, argamassas e produtos para alvenaria',
    },
    {
      name: 'Tijolos e Blocos',
      slug: 'tijolos-blocos',
      description: 'Tijolos cerâmicos, blocos de concreto e refratários',
    },
    {
      name: 'Tintas e Acessórios',
      slug: 'tintas-acessorios',
      description: 'Tintas, pincéis, rolos e materiais para pintura',
    },
    {
      name: 'Ferramentas',
      slug: 'ferramentas',
      description: 'Ferramentas manuais e elétricas para construção',
    },
    {
      name: 'Material Hidráulico',
      slug: 'material-hidraulico',
      description: 'Tubos, conexões, registros e torneiras',
    },
    {
      name: 'Material Elétrico',
      slug: 'material-eletrico',
      description: 'Fios, cabos, disjuntores e instalações elétricas',
    },
  ];

  const createdCategories: Record<string, any> = {};
  for (const cat of categories) {
    const created = await prisma.category.create({ data: cat });
    createdCategories[cat.slug] = created;
    console.log(`✅ Categoria criada: ${cat.name}`);
  }

  // Produtos por categoria
  const products = [
    // Cimento e Argamassa
    {
      name: 'Cimento CP II 50kg',
      slug: 'cimento-cp2-50kg',
      description: 'Cimento Portland CP II-E-32 ideal para obras em geral. Embalagem de 50kg. Alta resistência e durabilidade.',
      price: 32.90,
      stock: 500,
      imageUrl: productImages['Cimento CP II 50kg'],
      categoryId: createdCategories['cimento-argamassa'].id,
      featured: true,
    },
    {
      name: 'Argamassa AC-II 20kg',
      slug: 'argamassa-ac2-20kg',
      description: 'Argamassa colante AC-II para assentamento de cerâmicas e azulejos. Saco de 20kg. Uso interno e externo.',
      price: 18.50,
      stock: 300,
      imageUrl: productImages['Argamassa AC-II 20kg'],
      categoryId: createdCategories['cimento-argamassa'].id,
      featured: false,
    },
    {
      name: 'Cimento CP III 50kg',
      slug: 'cimento-cp3-50kg',
      description: 'Cimento Portland CP III-40 de alta resistência a sulfatos. Ideal para ambientes agressivos. 50kg.',
      price: 35.90,
      stock: 250,
      imageUrl: productImages['Cimento CP III 50kg'],
      categoryId: createdCategories['cimento-argamassa'].id,
      featured: false,
    },
    {
      name: 'Argamassa colante AC-III 20kg',
      slug: 'argamassa-colante-ac3-20kg',
      description: 'Argamassa colante AC-III para grandes formatos e áreas de alta exigência. Saco 20kg.',
      price: 24.90,
      stock: 200,
      imageUrl: productImages['Argamassa colante AC-III 20kg'],
      categoryId: createdCategories['cimento-argamassa'].id,
      featured: false,
    },

    // Tijolos e Blocos
    {
      name: 'Tijolo baiano 6 furos',
      slug: 'tijolo-baiano-6-furos',
      description: 'Tijolo cerâmico baiano com 6 furos. Dimensões: 9x14x19cm. Excelente para alvenaria de vedação.',
      price: 0.85,
      stock: 10000,
      imageUrl: productImages['Tijolo baiano 6 furos'],
      categoryId: createdCategories['tijolos-blocos'].id,
      featured: true,
    },
    {
      name: 'Bloco de concreto 14x19x39cm',
      slug: 'bloco-concreto-14x19x39',
      description: 'Bloco de concreto estrutural 14x19x39cm. Resistência 4,5 MPa. Ideal para alvenaria estrutural.',
      price: 4.20,
      stock: 5000,
      imageUrl: productImages['Bloco de concreto 14x19x39cm'],
      categoryId: createdCategories['tijolos-blocos'].id,
      featured: false,
    },
    {
      name: 'Tijolo refratário',
      slug: 'tijolo-refratario',
      description: 'Tijolo refratário para fornos, lareiras e churrasqueiras. Suporta altas temperaturas.',
      price: 3.50,
      stock: 800,
      imageUrl: productImages['Tijolo refratário'],
      categoryId: createdCategories['tijolos-blocos'].id,
      featured: false,
    },
    {
      name: 'Bloco de concreto canaleta',
      slug: 'bloco-concreto-canaleta',
      description: 'Bloco canaleta 14x19x39cm para cinta de amarração e vergas. Facilita passagem de ferragens.',
      price: 5.80,
      stock: 2000,
      imageUrl: productImages['Bloco de concreto canaleta'],
      categoryId: createdCategories['tijolos-blocos'].id,
      featured: false,
    },

    // Tintas e Acessórios
    {
      name: 'Tinta látex branca 18L',
      slug: 'tinta-latex-branca-18l',
      description: 'Tinta látex PVA branca fosca 18 litros. Secagem rápida, acabamento uniforme. Rendimento: 300-350m².',
      price: 189.90,
      stock: 150,
      imageUrl: productImages['Tinta látex branca 18L'],
      categoryId: createdCategories['tintas-acessorios'].id,
      featured: true,
    },
    {
      name: 'Tinta acrílica premium branca 3.6L',
      slug: 'tinta-acrilica-premium-36l',
      description: 'Tinta acrílica premium branca semibrilho 3,6L. Lavável, alta cobertura. Uso interno e externo.',
      price: 129.90,
      stock: 200,
      imageUrl: productImages['Tinta acrílica premium branca 3.6L'],
      categoryId: createdCategories['tintas-acessorios'].id,
      featured: false,
    },
    {
      name: 'Rolo de pintura profissional',
      slug: 'rolo-pintura-profissional',
      description: 'Rolo de lã para pintura profissional 23cm. Alta absorção e distribuição uniforme. Com cabo.',
      price: 18.90,
      stock: 400,
      imageUrl: productImages['Rolo de pintura profissional'],
      categoryId: createdCategories['tintas-acessorios'].id,
      featured: false,
    },
    {
      name: 'Pincel para pintura 3 polegadas',
      slug: 'pincel-pintura-3-polegadas',
      description: 'Pincel de cerdas sintéticas 3 polegadas. Ideal para acabamentos e cantos. Cabo em madeira.',
      price: 12.50,
      stock: 350,
      imageUrl: productImages['Pincel para pintura 3 polegadas'],
      categoryId: createdCategories['tintas-acessorios'].id,
      featured: false,
    },

    // Ferramentas
    {
      name: 'Martelo de unha profissional',
      slug: 'martelo-unha-profissional',
      description: 'Martelo de unha 25mm profissional. Cabo em fibra de vidro, cabeça forjada em aço. Ergonômico.',
      price: 45.90,
      stock: 180,
      imageUrl: productImages['Martelo de unha profissional'],
      categoryId: createdCategories['ferramentas'].id,
      featured: false,
    },
    {
      name: 'Furadeira de impacto elétrica',
      slug: 'furadeira-impacto-eletrica',
      description: 'Furadeira de impacto 650W com velocidade variável. Mandril 13mm. Inclui maleta e acessórios.',
      price: 289.90,
      stock: 80,
      imageUrl: productImages['Furadeira de impacto elétrica'],
      categoryId: createdCategories['ferramentas'].id,
      featured: true,
    },
    {
      name: 'Kit chave de fenda e Phillips',
      slug: 'kit-chave-fenda-phillips',
      description: 'Kit com 6 chaves de fenda e Phillips. Cabos emborrachados, pontas magnéticas. Maleta organizadora.',
      price: 34.90,
      stock: 220,
      imageUrl: productImages['Kit chave de fenda e Phillips'],
      categoryId: createdCategories['ferramentas'].id,
      featured: false,
    },

    // Material Hidráulico
    {
      name: 'Registro de gaveta 3/4"',
      slug: 'registro-gaveta-34',
      description: 'Registro de gaveta 3/4 polegada em metal cromado. Alta durabilidade. Uso em instalações hidráulicas.',
      price: 28.90,
      stock: 300,
      imageUrl: productImages['Registro de gaveta 3/4"'],
      categoryId: createdCategories['material-hidraulico'].id,
      featured: false,
    },
    {
      name: 'Tubo PVC esgoto 100mm 6m',
      slug: 'tubo-pvc-esgoto-100mm-6m',
      description: 'Tubo PVC para esgoto 100mm x 6 metros. Ponta e bolsa, alta resistência. Norma NBR 5688.',
      price: 64.90,
      stock: 400,
      imageUrl: productImages['Tubo PVC esgoto 100mm 6m'],
      categoryId: createdCategories['material-hidraulico'].id,
      featured: false,
    },
    {
      name: 'Torneira para pia cromada',
      slug: 'torneira-pia-cromada',
      description: 'Torneira de mesa para pia cromada. Arejador, acabamento premium. Garantia 5 anos.',
      price: 89.90,
      stock: 150,
      imageUrl: productImages['Torneira para pia cromada'],
      categoryId: createdCategories['material-hidraulico'].id,
      featured: true,
    },

    // Material Elétrico
    {
      name: 'Fio elétrico flexível 2.5mm rolo 100m',
      slug: 'fio-eletrico-25mm-100m',
      description: 'Fio elétrico flexível 2,5mm² rolo com 100 metros. Condutor de cobre, isolamento em PVC. Certificado.',
      price: 169.90,
      stock: 120,
      imageUrl: productImages['Fio elétrico flexível 2.5mm rolo 100m'],
      categoryId: createdCategories['material-eletrico'].id,
      featured: false,
    },
    {
      name: 'Disjuntor bipolar 32A',
      slug: 'disjuntor-bipolar-32a',
      description: 'Disjuntor termomagnético bipolar 32A curva C. DIN, alta capacidade de ruptura. Certificado INMETRO.',
      price: 38.90,
      stock: 250,
      imageUrl: productImages['Disjuntor bipolar 32A'],
      categoryId: createdCategories['material-eletrico'].id,
      featured: false,
    },
    {
      name: 'Tomada 2P+T 10A padrão novo',
      slug: 'tomada-2pt-10a-padrao-novo',
      description: 'Tomada 2P+T 10A padrão novo NBR 14136. Branca, placa incluída. Material termoplástico de alta qualidade.',
      price: 12.90,
      stock: 500,
      imageUrl: productImages['Tomada 2P+T 10A padrão novo'],
      categoryId: createdCategories['material-eletrico'].id,
      featured: false,
    },
  ];

  for (const prod of products) {
    await prisma.product.create({ data: prod });
    console.log(`✅ Produto criado: ${prod.name}`);
  }

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('📊 Resumo:');
  console.log(`   - ${await prisma.user.count()} usuários`);
  console.log(`   - ${await prisma.category.count()} categorias`);
  console.log(`   - ${await prisma.product.count()} produtos`);
  console.log('\n👤 Credenciais de acesso:');
  console.log('   🔑 Admin Principal: john@doe.com / johndoe123');
  console.log('   🔑 Admin MACOFEL: admin@macofel.com / admin123');
  console.log('   🔑 Cliente Teste: cliente@teste.com / cliente123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
