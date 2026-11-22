export const FONTE = {
  medio: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,

  xs: '11px',
  sm: '12px',
  md: '14px',
  base: '15px',
  lg: '16px',
  // Campos de texto: abaixo de 16px o iPhone dá zoom ao focar.
  campo: '16px',
  xl: '18px',
  xxl: '20px',
}

export const RAIO = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xxl: '24px',
  pill: '20px',
  full: '50%',
}

export const COR = {
  // Tokens que mudam com o tema: definidos em index.css. Não concatene alfa
  // neles (borda + "55" quebra): use var(--borda-suave).
  borda: 'var(--borda)',
  divisoria: 'var(--divisoria)',
  // neutro, erro, sucesso e as cores de categoria seguem em hex: são usados em cor + "22".
  neutro: '#ADB5BD',

  // Texto sobre fundo amarelo/laranja da marca (nunca branco: contraste baixo).
  textoSobreDestaque: '#212529',

  // Laranja da marca para TEXTO (o --laranja puro tem só ~3:1 sobre o branco):
  // misturado com preto no claro e com branco no escuro (--mistura-tag).
  laranjaTexto: 'color-mix(in srgb, var(--laranja) 65%, var(--mistura-tag))',

  erro: '#FA5252',
  erroBg: 'var(--erro-bg)',

  sucesso: '#2F9E44',
  sucessoBg: 'var(--sucesso-bg)',
  sucessoBorda: 'var(--sucesso-borda)',
}

export const BORDA = `1.5px solid ${COR.borda}`

// Sombra laranja dos botões de destaque (cor em index.css: --laranja-sombra).
export const SOMBRA_LARANJA = '0 4px 12px var(--laranja-sombra)'

export const TIPOGRAFIA = {
  display: { fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px' },
  h2: { fontSize: '20px', fontWeight: 800, letterSpacing: '0px' },
  h3: { fontSize: '18px', fontWeight: 700, letterSpacing: '0px' },
  titulo: { fontSize: '22px', fontWeight: 800, letterSpacing: '0px' },
  label: { fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' },
  categoria: { fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' },
  nomeProduto: { fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px' },
  subcategoria: { fontSize: '12px', fontWeight: 400, letterSpacing: '0.8px' },
  corpo: { fontSize: '14px', fontWeight: 400, letterSpacing: '0px' },
  aba: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px' },
  abaInativa: { fontSize: '12px', fontWeight: 500, letterSpacing: '0.3px' },
}

export const BOTAO_PRIMARIO = {
  background: 'linear-gradient(135deg, var(--amarelo), var(--laranja))',
  color: COR.textoSobreDestaque,
  borderRadius: RAIO.md,
  border: 'none',
  fontFamily: 'Nunito, sans-serif',
  fontWeight: 700,
  fontSize: '15px',
  letterSpacing: '0.3px',
  cursor: 'pointer',
}

export const BOTAO_SECUNDARIO = {
  background: 'transparent',
  color: 'var(--text-soft)',
  borderRadius: RAIO.md,
  border: BORDA,
  fontFamily: 'Nunito, sans-serif',
  fontWeight: 600,
  fontSize: '14px',
  letterSpacing: '0.3px',
  cursor: 'pointer',
}
// Botão desabilitado: aplique `...(desabilitado && BOTAO_DESABILITADO)` por último.
export const BOTAO_DESABILITADO = { opacity: 0.45, cursor: 'not-allowed' }
