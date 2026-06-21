import { COR } from './estilos'

export const COR_CATEGORIA = {
  'Proteínas': '#d32f2f',
  'Hortifrúti': '#4caf50',
  'Carboidratos Secos': '#ffc107',
  'Enlatados e Conservas': '#607d8b',
  'Produtos Orientais': '#ff5722',
  'Confeitaria e Doces': '#f06292',
  'Óleos, Azeites e Vinagres': '#bf360c',
  'Temperos e Condimentos': '#8d6e63',
  'Laticínios': '#ddd26f',
  'Bebidas': '#673ab7',
  'Limpeza': '#03a9f4',
  'Utensílios de Cozinha': '#455a64',
  'Higiene Pessoal': '#80cbc4',
  'Padaria': '#E8B84B',
  'Congelados': '#91C7F5',
  'Mercearia Salgada': '#ac6b40',
  'Farmácia Básica': '#3049d8',
  'Pet Shop': '#4b2828',
  'Alimentos para Bebê': '#8c65a5',
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
  return COR_CATEGORIA[categoria] || COR.neutro
}

export function textoParaCor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminancia > 0.5 ? '#212529' : '#FFFFFF'
}