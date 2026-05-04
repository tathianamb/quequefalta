export const COR_CATEGORIA = {
  'Proteínas': '#FF6B6B',
  'Hortifrúti': '#51CF66',
  'Carboidratos Secos': '#FFD43B',
  'Enlatados e Conservas': '#FF922B',
  'Produtos Orientais': '#F06595',
  'Confeitaria': '#CC5DE8',
  'Óleos, Azeites e Vinagres': '#94D82D',
  'Temperos e Condimentos': '#FF6B6B',
  'Laticínios': '#74C0FC',
  'Bebidas': '#4DABF7',
  'Limpeza': '#63E6BE',
  'Utensílios de Cozinha': '#A9E34B',
  'Higiene Pessoal': '#F783AC',
}

export const ORDEM_CATEGORIAS = [
  'Proteínas',
  'Hortifrúti',
  'Carboidratos Secos',
  'Enlatados e Conservas',
  'Produtos Orientais',
  'Confeitaria',
  'Óleos, Azeites e Vinagres',
  'Temperos e Condimentos',
  'Laticínios',
  'Bebidas',
  'Limpeza',
  'Utensílios de Cozinha',
  'Higiene Pessoal',
]

export function corDaCategoria(categoria) {
  return COR_CATEGORIA[categoria] || '#ADB5BD'
}