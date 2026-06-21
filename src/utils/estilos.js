export const FONTE = {
  regular: 400,
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
  xl: '18px',
  xxl: '20px',
  titulo: '22px',
  display: '32px',
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
  borda: '#DEE2E6',
  divisoria: '#F1F3F5',
  neutro: '#ADB5BD',

  erro: '#FA5252',
  erroBg: '#FFE3E3',

  sucesso: '#2F9E44',
  sucessoBg: '#EBFBEE',
  sucessoBorda: '#69DB7C',
}

export const BORDA = `1.5px solid ${COR.borda}`

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
  color: '#212529',
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