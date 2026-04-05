export type RootCategoryDef = {
  name: string;
  slug: string;
  description: string;
};

export const ROOT_CATEGORIES: RootCategoryDef[] = [
  {
    name: 'Cimento e Argamassa',
    slug: 'cimento-argamassa',
    description: 'Cimentos, argamassas, rejuntes, cal e massas de assentamento.',
  },
  {
    name: 'Tijolos e Blocos',
    slug: 'tijolos-blocos',
    description: 'Tijolos, blocos de concreto e itens estruturais de alvenaria.',
  },
  {
    name: 'Tintas e Acessórios',
    slug: 'tintas-acessorios',
    description: 'Tintas, vernizes, rolos, pincéis, lixas e acessórios de pintura.',
  },
  {
    name: 'Ferramentas',
    slug: 'ferramentas',
    description: 'Ferramentas manuais, elétricas e acessórios de trabalho.',
  },
  {
    name: 'Material Hidráulico',
    slug: 'material-hidraulico',
    description: 'Torneiras, registros, válvulas, conexões, tubos e acessórios hidráulicos.',
  },
  {
    name: 'Material Elétrico',
    slug: 'material-eletrico',
    description: 'Fios, cabos, disjuntores, tomadas, interruptores e itens elétricos.',
  },
];

export type TaxonomyNode = {
  name: string;
  slug: string;
  description?: string;
  parentSlug: string | null;
  sortOrder: number;
};

export const CATEGORY_TAXONOMY: TaxonomyNode[] = [
  ...ROOT_CATEGORIES.map((c, i) => ({ ...c, parentSlug: null, sortOrder: i })),
  { name: 'Cimento', slug: 'cimento', parentSlug: 'cimento-argamassa', sortOrder: 101 },
  { name: 'Argamassa', slug: 'argamassa', parentSlug: 'cimento-argamassa', sortOrder: 102 },
  { name: 'Rejunte', slug: 'rejunte', parentSlug: 'cimento-argamassa', sortOrder: 102 },
  { name: 'Cal', slug: 'cal', parentSlug: 'cimento-argamassa', sortOrder: 103 },
  {
    name: 'Aditivos e Impermeabilizantes',
    slug: 'aditivos-impermeabilizantes',
    parentSlug: 'cimento-argamassa',
    sortOrder: 104,
  },
  { name: 'Tijolos', slug: 'tijolos', parentSlug: 'tijolos-blocos', sortOrder: 200 },
  {
    name: 'Blocos de Concreto',
    slug: 'blocos-concreto',
    parentSlug: 'tijolos-blocos',
    sortOrder: 201,
  },
  {
    name: 'Telhas e Artefatos de Cimento',
    slug: 'telhas-artefatos-cimento',
    parentSlug: 'tijolos-blocos',
    sortOrder: 202,
  },
  {
    name: 'Tintas Látex / Esmalte',
    slug: 'tintas-latex-esmalte',
    parentSlug: 'tintas-acessorios',
    sortOrder: 303,
  },
  { name: 'Verniz e Selador', slug: 'verniz-selador', parentSlug: 'tintas-acessorios', sortOrder: 304 },
  {
    name: 'Massa Corrida',
    slug: 'massa-corrida',
    parentSlug: 'tintas-acessorios',
    sortOrder: 305,
  },
  {
    name: 'Rolos, Pincéis e Acessórios',
    slug: 'rolos-pinceis-acessorios',
    parentSlug: 'tintas-acessorios',
    sortOrder: 306,
  },
  {
    name: 'Ferramentas Manuais',
    slug: 'ferramentas-manuais',
    parentSlug: 'ferramentas',
    sortOrder: 400,
  },
  {
    name: 'Ferramentas Elétricas',
    slug: 'ferramentas-eletricas',
    parentSlug: 'ferramentas',
    sortOrder: 401,
  },
  {
    name: 'Brocas e Discos',
    slug: 'brocas-discos',
    parentSlug: 'ferramentas',
    sortOrder: 402,
  },
  { name: 'Alicates', slug: 'alicates', parentSlug: 'ferramentas-manuais', sortOrder: 410 },
  {
    name: 'Chaves',
    slug: 'chaves',
    parentSlug: 'ferramentas-manuais',
    sortOrder: 411,
  },
  { name: 'Martelos', slug: 'martelos', parentSlug: 'ferramentas-manuais', sortOrder: 412 },
  { name: 'Serrotes', slug: 'serrotes', parentSlug: 'ferramentas-manuais', sortOrder: 413 },
  { name: 'Furadeiras', slug: 'furadeiras', parentSlug: 'ferramentas-eletricas', sortOrder: 420 },
  {
    name: 'Serras Elétricas',
    slug: 'serras-eletricas',
    parentSlug: 'ferramentas-eletricas',
    sortOrder: 421,
  },
  {
    name: 'Parafusadeiras',
    slug: 'parafusadeiras',
    parentSlug: 'ferramentas-eletricas',
    sortOrder: 422,
  },
  { name: 'Brocas', slug: 'brocas', parentSlug: 'brocas-discos', sortOrder: 430 },
  { name: 'Discos', slug: 'discos', parentSlug: 'brocas-discos', sortOrder: 431 },
  {
    name: 'Torneiras e Misturadores',
    slug: 'torneiras-misturadores',
    parentSlug: 'material-hidraulico',
    sortOrder: 500,
  },
  {
    name: 'Válvulas e Registros',
    slug: 'valvulas-registros',
    parentSlug: 'material-hidraulico',
    sortOrder: 501,
  },
  {
    name: 'Conexões PVC / Soldável',
    slug: 'conexoes-pvc-soldavel',
    parentSlug: 'material-hidraulico',
    sortOrder: 502,
  },
  { name: 'Tubos', slug: 'tubos', parentSlug: 'material-hidraulico', sortOrder: 504 },
  {
    name: 'Ralos, Sifões e Caixas Sifonadas',
    slug: 'ralos-sifoes-caixas-sifonadas',
    parentSlug: 'material-hidraulico',
    sortOrder: 505,
  },
  {
    name: 'Cubas e Lavatórios',
    slug: 'cubas-lavatorios',
    parentSlug: 'material-hidraulico',
    sortOrder: 506,
  },
  {
    name: 'Chuveiros e Duchas',
    slug: 'chuveiros-duchas',
    parentSlug: 'material-hidraulico',
    sortOrder: 507,
  },
  {
    name: 'Fios e Cabos',
    slug: 'fios-cabos',
    parentSlug: 'material-eletrico',
    sortOrder: 600,
  },
  {
    name: 'Disjuntores e Quadros',
    slug: 'disjuntores-quadros',
    parentSlug: 'material-eletrico',
    sortOrder: 601,
  },
  {
    name: 'Interruptores e Tomadas',
    slug: 'interruptores-tomadas',
    parentSlug: 'material-eletrico',
    sortOrder: 602,
  },
  {
    name: 'Lâmpadas e Luminárias',
    slug: 'lampadas-luminarias',
    parentSlug: 'material-eletrico',
    sortOrder: 603,
  },
  { name: 'Plafons e Spots LED', slug: 'plafons-spots-led', parentSlug: 'material-eletrico', sortOrder: 604 },
];

const ROOT_BY_SLUG = new Map(ROOT_CATEGORIES.map((c) => [c.slug, c]));
const TAXONOMY_BY_SLUG = new Map(CATEGORY_TAXONOMY.map((n) => [n.slug, n]));

const KEYWORDS_BY_ROOT: Record<string, string[]> = {
  'cimento-argamassa': [
    'cimento',
    'argamassa',
    'rejunte',
    'cal',
    'gesso',
    'massa',
    'massa corrida',
    'impermeabilizante',
  ],
  'tijolos-blocos': ['tijolo', 'tijolos', 'bloco', 'blocos', 'canaleta', 'paver'],
  'tintas-acessorios': [
    'tinta',
    'verniz',
    'selador',
    'esmalte',
    'rolo',
    'pincel',
    'lixa',
    'fita crepe',
    'massa acrilica',
    'textura',
  ],
  ferramentas: [
    'ferramenta',
    'alicate',
    'martelo',
    'broca',
    'serra',
    'chave',
    'parafusadeira',
    'furadeira',
    'trena',
    'disco',
    'parafuso',
    'prego',
    'fechadura',
    'cadeado',
    'epi',
    'oculos',
    'respirador',
    'luva nitrilica',
    'luva latex',
    'botina',
  ],
  'material-hidraulico': [
    'hidraul',
    'torneira',
    'registro',
    'valvula',
    'docol',
    'tigre',
    'conexao',
    'conexao pvc',
    'pvc',
    'joelho',
    'te ',
    'cano',
    'tubo',
    'mangueira',
    'sifao',
    'ralo',
    'caixa d agua',
    'caixa acoplada',
    'caixa de descarga',
    'assento sanitario',
    'bacia sanitaria',
    'ducha higienica',
    'chuveiro',
    'boia',
    'acabamento docol',
    'abracadeira',
  ],
  'material-eletrico': [
    'eletric',
    'fio',
    'cabo',
    'disjuntor',
    'interruptor',
    'tomada',
    'lampada',
    'led',
    'eletroduto',
    'conduite',
    'quadro',
    'fusivel',
    'contator',
    'rele',
  ],
};

export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugifyCategoryName(raw: string): string {
  return normalizeText(raw)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function isRootCategorySlug(slug: string): boolean {
  return ROOT_BY_SLUG.has(slug);
}

export function isTaxonomyCategorySlug(slug: string): boolean {
  return TAXONOMY_BY_SLUG.has(slug);
}

export function getRootBySlug(slug: string) {
  return ROOT_BY_SLUG.get(slug) ?? null;
}

export function rootSlugForTaxonomySlug(slug: string): string {
  let current = TAXONOMY_BY_SLUG.get(slug);
  while (current?.parentSlug) {
    current = TAXONOMY_BY_SLUG.get(current.parentSlug);
  }
  return current?.slug ?? 'ferramentas';
}

const KEYWORDS_BY_TAXONOMY_SLUG: Record<string, string[]> = {
  'argamassa': ['argamassa', 'ac1', 'ac2', 'ac3'],
  'cimento': ['cimento', 'cp2', 'cp3', 'cp4'],
  'rejunte': ['rejunte'],
  'cal': ['cal'],
  'aditivos-impermeabilizantes': ['aditivo', 'impermeabil', 'vedacit', 'sika'],
  'tijolos': ['tijolo', 'tijolos', 'tijolo comum', 'tijolo baiano', 'baiano'],
  'blocos-concreto': ['bloco de concreto', 'bloco concreto', 'bloco', 'blocos', 'canaleta'],
  'telhas-artefatos-cimento': ['telha', 'artefato', 'cumeeira', 'fibrocimento', 'paver'],
  'tintas-latex-esmalte': ['latex', 'pva', 'esmalte', 'tinta', 'tintas', 'spray'],
  'verniz-selador': ['verniz', 'selador', 'stain'],
  'massa-corrida': ['massa corrida', 'massa acrilica', 'nivelador'],
  'rolos-pinceis-acessorios': ['rolo', 'pincel', 'bandeja', 'lixa', 'fita crepe', 'acessorio pintura'],
  'alicates': ['alicate'],
  'chaves': ['chave', 'allen', 'fenda', 'phillips', 'estrela'],
  'martelos': ['martelo'],
  'serrotes': ['serrote', 'arco de serra', 'serra manual', 'serrote'],
  'furadeiras': ['furadeira'],
  'serras-eletricas': ['serra eletrica', 'serra circular', 'tico tico'],
  'parafusadeiras': ['parafusadeira'],
  'brocas': ['broca'],
  'discos': ['disco', 'disco de corte', 'disco corte', 'flap', 'disco flap', 'lixa disco'],
  'torneiras-misturadores': ['torneira', 'misturador', 'monocomando'],
  'valvulas-registros': ['valvula', 'registro', 'acabamento docol', 'acabamento valvula'],
  'conexoes-pvc-soldavel': ['soldavel', 'pvc', 'joelho', 'te ', 'conexao', 'conexoes', 'engate'],
  'tubos': ['tubo', 'tubos', 'cano', 'polietileno', 'mangueira'],
  'ralos-sifoes-caixas-sifonadas': ['ralo', 'sifao', 'caixa sifonada', 'caixa acoplada', 'caixa de descarga'],
  'cubas-lavatorios': ['cuba', 'lavatorio', 'pia', 'assento sanitario', 'bacia sanitaria', 'loucas sanitarias'],
  'chuveiros-duchas': ['chuveiro', 'ducha'],
  'fios-cabos': ['fio', 'cabo'],
  'disjuntores-quadros': ['disjuntor', 'quadro'],
  'interruptores-tomadas': ['interruptor', 'tomada'],
  'lampadas-luminarias': ['lampada', 'luminaria', 'refletor', 'reator'],
  'plafons-spots-led': ['plafon', 'spot', 'led'],
};

const DEFAULT_TAXONOMY_BY_ROOT: Record<string, string> = {
  'cimento-argamassa': 'argamassa',
  'tijolos-blocos': 'tijolos',
  'tintas-acessorios': 'tintas-latex-esmalte',
  ferramentas: 'ferramentas-manuais',
  'material-hidraulico': 'conexoes-pvc-soldavel',
  'material-eletrico': 'fios-cabos',
};

function keywordScore(normalized: string, keyword: string): number {
  if (!keyword) return 0;
  const idx = normalized.indexOf(keyword);
  if (idx < 0) return 0;
  // Prioriza palavras mais específicas e matches em começo de string.
  const base = keyword.length;
  const bonusStart = idx === 0 ? 5 : 0;
  return base + bonusStart;
}

export function mapCategoryNameToTaxonomySlug(name: string): string {
  const normalized = normalizeText(name);

  for (const node of CATEGORY_TAXONOMY) {
    if (normalized === normalizeText(node.name)) return node.slug;
  }

  let bestSlug: string | null = null;
  let bestScore = 0;
  for (const [taxonomySlug, keywords] of Object.entries(KEYWORDS_BY_TAXONOMY_SLUG)) {
    for (const keyword of keywords) {
      const score = keywordScore(normalized, keyword);
      if (score > bestScore) {
        bestScore = score;
        bestSlug = taxonomySlug;
      }
    }
  }
  if (bestSlug) return bestSlug;

  // Fallback por raiz para evitar cair sempre em ferramentas.
  let bestRoot: string | null = null;
  let bestRootScore = 0;
  for (const [rootSlug, keywords] of Object.entries(KEYWORDS_BY_ROOT)) {
    for (const keyword of keywords) {
      const score = keywordScore(normalized, keyword);
      if (score > bestRootScore) {
        bestRootScore = score;
        bestRoot = rootSlug;
      }
    }
  }
  if (bestRoot) {
    return DEFAULT_TAXONOMY_BY_ROOT[bestRoot] ?? 'ferramentas-manuais';
  }

  return 'ferramentas-manuais';
}
