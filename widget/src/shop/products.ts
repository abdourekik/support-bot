// Product facts come from data/knowledge_base/produits-entretien.md.
// No prices on purpose: the knowledge base has none, so the bot could not answer about them.
export type Illustration = 'bedding' | 'fitted-sheet' | 'towel' | 'bath-sheet' | 'cushion' | 'pillowcase';

export interface Product {
  id: string;
  name: string;
  category: 'Linge de lit' | 'Linge de bain' | 'Coussins';
  description: string;
  details: string;
  illustration: Illustration;
  colors: [string, string];
}

export const PRODUCTS: Product[] = [
  {
    id: 'parure-percale',
    name: 'Housse de couette en percale',
    category: 'Linge de lit',
    description: '100 % coton, tissage serré, doux et frais.',
    details: '140 × 200, 220 × 240 ou 240 × 260 cm',
    illustration: 'bedding',
    colors: ['#e9e2d6', '#c9b8a0'],
  },
  {
    id: 'drap-housse-lin',
    name: 'Drap housse en lin lavé',
    category: 'Linge de lit',
    description: '100 % lin, aspect froissé naturel, s’adoucit à chaque lavage.',
    details: 'Bonnet de 30 cm · du 90 × 190 au 180 × 200 cm',
    illustration: 'fitted-sheet',
    colors: ['#d8ddd2', '#8fa08d'],
  },
  {
    id: 'taies-percale',
    name: 'Taies d’oreiller en percale',
    category: 'Linge de lit',
    description: 'Assorties à nos housses de couette en percale de coton.',
    details: '50 × 70 cm ou 65 × 65 cm',
    illustration: 'pillowcase',
    colors: ['#f1ebe2', '#d1bfa7'],
  },
  {
    id: 'serviette-eponge',
    name: 'Serviette éponge',
    category: 'Linge de bain',
    description: 'Éponge 100 % coton de 500 g/m², moelleuse et absorbante.',
    details: '50 × 100 cm',
    illustration: 'towel',
    colors: ['#e7d3c4', '#b98a6d'],
  },
  {
    id: 'drap-de-bain',
    name: 'Drap de bain',
    category: 'Linge de bain',
    description: 'La même éponge 500 g/m², en grand format.',
    details: '70 × 140 cm',
    illustration: 'bath-sheet',
    colors: ['#d5dde0', '#7f98a1'],
  },
  {
    id: 'housse-coussin-lin',
    name: 'Housse de coussin en lin',
    category: 'Coussins',
    description: 'Lin ou coton, avec fermeture invisible.',
    details: '40 × 40, 45 × 45 ou 50 × 50 cm',
    illustration: 'cushion',
    colors: ['#e6dccb', '#a8926f'],
  },
];
