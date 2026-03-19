export type HeroDefaultSlide = {
  imageUrl: string;
  subtitle?: string | null;
  title?: string | null;
  text?: string | null;
  href?: string | null;
  order: number;
  active: boolean;
};

// Fonte única dos slides atuais exibidos no Hero da home.
export const HERO_DEFAULT_SLIDES: HeroDefaultSlide[] = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1920&auto=format&fit=crop',
    subtitle: 'RESGATE SEU CUPOM',
    title: 'PRIMEIRACOMPRA',
    text: 'E APROVEITE OFERTAS EM TODO O SITE • ENTREGAS PARA TODO O BRASIL',
    href: null,
    order: 0,
    active: true,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=1920&auto=format&fit=crop',
    subtitle: 'FERRAMENTAS DE QUALIDADE',
    title: 'CONSTRUA COM CONFIANÇA',
    text: 'As melhores ferramentas para sua obra • Até 12x sem juros',
    href: null,
    order: 1,
    active: true,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1920&auto=format&fit=crop',
    subtitle: 'MATERIAIS ELÉTRICOS',
    title: 'INSTALAÇÃO COMPLETA',
    text: 'Tudo para sua instalação elétrica • Entrega rápida e segura',
    href: null,
    order: 2,
    active: true,
  },
  {
    imageUrl: 'https://macofel-tres.lwdigitalforge.com/api/images/69b16bb18ca4517796426f87',
    subtitle: 'MATERIAIS HIDRÁULICOS',
    title: 'QUALIDADE GARANTIDA',
    text: 'Produtos certificados • Melhor preço da região',
    href: null,
    order: 3,
    active: true,
  },
];

