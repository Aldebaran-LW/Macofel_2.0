/**
 * Diagnóstico: por que produtos com imagem podem não aparecer na home.
 * Uso: npx tsx --require dotenv/config scripts/diag-home-images.ts
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const INACTIVE = [
  false,
  0,
  '0',
  'false',
  'inativo',
  'INATIVO',
  'inactive',
  'INACTIVE',
  'pending_review',
  'imported',
  'rejected',
] as const;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI não definido no .env');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('products');
  const cats = client.db().collection('categories');

  const activeQ = { status: { $nin: [...INACTIVE] } };
  const hasSomeImageStored = {
    $or: [
      { imageUrl: { $regex: /\S/ } },
      { 'imageUrls.0': { $exists: true } },
    ],
  };

  const total = await col.countDocuments({});
  const active = await col.countDocuments(activeQ);
  const activeWithPhoto = await col.countDocuments({ $and: [activeQ, hasSomeImageStored] });
  const activeFeaturedPhoto = await col.countDocuments({
    $and: [activeQ, { featured: true }, hasSomeImageStored],
  });

  console.log('\n=== Resumo ===');
  console.log({ totalProducts: total, activeInCatalog: active, activeWithImageOrGallery: activeWithPhoto, activeFeaturedWithImageOrGallery: activeFeaturedPhoto });

  const homeMacroSlugs = [
    ['cimento-argamassa', 'cimento'],
    ['tijolos-blocos'],
    ['tintas-acessorios', 'tintas'],
    ['ferramentas'],
    ['material-hidraulico', 'hidraulica'],
    ['material-eletrico', 'eletrica'],
  ];

  console.log('\n=== Por slug de macro (home tenta até achar produtos COM foto na API) ===');
  for (const group of homeMacroSlugs) {
    const labels = group.join(' | ');
    let foundWithPhoto = 0;
    for (const slug of group) {
      const cat = await cats.findOne({ slug });
      if (!cat) {
        console.log(`  [${labels}] slug "${slug}" → categoria não encontrada`);
        continue;
      }
      const q = { ...activeQ, categoryId: cat._id };
      const n = await col.countDocuments({ $and: [q, hasSomeImageStored] });
      const nCat = await col.countDocuments(q);
      console.log(`  slug "${slug}": produtos ativos na categoria=${nCat}, com imagem/url galeria=${n}`);
      foundWithPhoto += n;
      if (n > 0) break;
    }
  }

  const withImageButExcluded = await col
    .find({
      $and: [
        hasSomeImageStored,
        {
          status: { $in: [...INACTIVE] },
        },
      ],
    })
    .project({ name: 1, slug: 1, status: 1, featured: 1, imageUrl: 1 })
    .limit(30)
    .toArray();

  console.log('\n=== Amostra: têm URL de imagem/galeria mas status EXCLUI da vitrine (inativo/imported/etc.) ===');
  console.log(withImageButExcluded.length ? withImageButExcluded.map((p) => ({ name: p.name, slug: p.slug, status: p.status })) : '(nenhum)');

  const activeGalleryOnlyEmptyMain = await col
    .find({
      $and: [
        activeQ,
        { imageUrl: { $not: /\S/ } },
        { 'imageUrls.0': { $exists: true } },
      ],
    })
    .project({ name: 1, slug: 1 })
    .limit(10)
    .toArray();

  console.log('\n=== ATIVOS: imageUrl vazio mas imageUrls tem item (getProducts faz fallback → deve aparecer na home se featured/categoria OK) ===');
  console.log(activeGalleryOnlyEmptyMain.length ? activeGalleryOnlyEmptyMain : '(nenhum — fallback cobre)');

  const wrongFieldGuess = await col
    .find({
      $and: [
        activeQ,
        { $nor: [{ imageUrl: { $regex: /\S/ } }, { 'imageUrls.0': { $exists: true } }] },
        {
          $or: [
            { images: { $exists: true, $ne: [] } },
            { thumbnail: { $exists: true, $ne: '' } },
          ],
        },
      ],
    })
    .project({ name: 1, slug: 1, thumbnail: 1 })
    .limit(15)
    .toArray();

  console.log('\n=== Possível imagem em campo legado `images`/`thumbnail` (home só usa imageUrl + imageUrls[]) ===');
  console.log(wrongFieldGuess.length ? wrongFieldGuess : '(nenhum encontrado nesta coleta)');

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
