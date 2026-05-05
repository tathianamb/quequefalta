export const COR_CATEGORIA = {
  'Proteínas': '#FF6B6B',
  'Hortifrúti': '#51CF66',
  'Carboidratos Secos': '#FFD43B',
  'Enlatados e Conservas': '#FF922B',
  'Produtos Orientais': '#F06595',
  'Confeitaria e Doces': '#CC5DE8',
  'Óleos, Azeites e Vinagres': '#94D82D',
  'Temperos e Condimentos': '#FFA94D',
  'Laticínios': '#74C0FC',
  'Bebidas': '#4DABF7',
  'Limpeza': '#63E6BE',
  'Utensílios de Cozinha': '#A9E34B',
  'Higiene Pessoal': '#F783AC',
  'Padaria': '#E8B84B',
  'Congelados': '#91C7F5',
  'Mercearia Salgada': '#FF8787',
  'Farmácia Básica': '#69DB7C',
  'Pet Shop': '#FFA8A8',
  'Alimentos para Bebê': '#B5D5FB',
}

export const ORDEM_CATEGORIAS = [
  'Proteínas',
  'Hortifrúti',
  'Carboidratos Secos',
  'Padaria',
  'Laticínios',
  'Congelados',
  'Enlatados e Conservas',
  'Mercearia Salgada',
  'Temperos e Condimentos',
  'Óleos, Azeites e Vinagres',
  'Produtos Orientais',
  'Confeitaria e Doces',
  'Bebidas',
  'Limpeza',
  'Utensílios de Cozinha',
  'Higiene Pessoal',
  'Farmácia Básica',
  'Pet Shop',
  'Alimentos para Bebê',
]

export function corDaCategoria(categoria) {
  return COR_CATEGORIA[categoria] || '#ADB5BD'
}

export function textoParaCor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminancia > 0.5 ? '#212529' : '#FFFFFF'
}