// Parser de receitas em texto livre — arquitetura em camadas.
// Princípio: regex reconhece FORMATO. Código decide SIGNIFICADO.

/* =========================================================================
   CAMADA 1 — REGEX (só reconhecem formato; não decidem nada)
   ========================================================================= */
const FRACOES_STR = '¼½¾⅓⅔⅛⅜⅝⅞'

const RE = {
  comecaNumero: /^\d/,
  comecaFracao: new RegExp(`^[${FRACOES_STR}]`),

  quantidade: new RegExp(
    `^(` +
      `\\d+\\s+\\d+\\/\\d+` +           
      `|\\d+\\s*[${FRACOES_STR}]` +     
      `|\\d+\\/\\d+` +                  
      `|[${FRACOES_STR}]` +             
      `|\\d+(?:[.,]\\d+)?` +            
    `)\\s*`
  ),

  unidade: new RegExp(
    `^(?:d[eaos]+\\s+)?(` +        
      `quilos?|kg` +
      `|gramas?` +
      `|litros?|ml|mL` +
      `|x[ií]c(?:ara)?s?\\.?` +
      `|(?:c\\.?l\\.?|colh?(?:er(?:es)?)?)\\.?\\s*(?:de\\s+)?(?:sopa|ch[áa]|caf[ée])?` +
      `|pitadas?|latas?|pacotes?|dentes?|fatias?|ramos?|unidades?|un\\.?` +
      `|kg|ml|l|g` +
    `)(?:\\s+d[eaos]+\\s+|\\s+|$)`,
    'i'
  ),

  embalagem: /^\(([^)]*)\)\s*(?:de\s+)?/i,

  tempoRotulado: /(?:tempo(?:\s+de\s+(?:preparo|cozimento))?|pronto\s+em|preparo)\s*:?\s*(\d+)\s*(h(?:ora)?s?|min(?:uto)?s?)/i,
  tempoHM: /(\d+)\s*h(?:ora)?s?\s*(?:e\s*)?(\d+)?\s*(?:min(?:uto)?s?)?/i,
  tempoMin: /(\d+)\s*min(?:uto)?s?/i,

  porcoes: /(?:(\d+)\s*(?:por[çc][õo]es?|pessoas?|fatias?)|(?:serve[m]?|rende[m]?|d[áa]\s+para)\s+(\d+)|rendimento:?\s*(\d+))/i,
  dificuldade: /f[aá]cil|m[eé]di[ao]|intermedi[áa]ri[ao]|dif[ií]cil/i,

  cabecalho: /^(modo de (?:preparo|fazer)|ingredientes?|preparos?|instru[çc][õo]es|instru[çc][ãa]o|receita|como fazer|utens[íi]lios|passo\s*a\s*passo|passos)(\s*[\(:,].*)?$/i,
  subCabecalho: /^para\s+(o|a|os|as)\s+\w+/i,

  separador: /^[-=*_]{3,}\s*$/,
  numeracaoPasso: /^\s*(?:passo|step|etapa)\s+\d+\s*[:\-.)]\s*/i,
  numeracaoSimples: /^\s*\d+\s*[:.)\-]\s*/,

  aGostoSufixo: /\s+a\s+gosto\s*$/i,
  paraUsoSufixo: /\s+(para\s+\S+(?:\s+\S+)?)\s*$/i,
}

/* =========================================================================
   CAMADA 2 — LÉXICOS (listas que o código consulta; extensíveis sem regex)
   ========================================================================= */
const LEXICO = {
  // Unidades que não fazem sentido com decimal ("1,9 dentes" é suspeito)
  unidadesInteiras: ['dente', 'dentes', 'lata', 'latas', 'fatia', 'fatias',
                     'pacote', 'pacotes', 'unidade', 'unidades', 'ramo', 'ramos'],

  // Termos de preparo que colados ao fim do nome devem ir para OBS
  preparos: ['picado', 'picados', 'picada', 'picadas', 'ralado', 'ralada',
             'cozido', 'cozida', 'cozidos', 'cozidas', 'fresco', 'fresca',
             'frito', 'frita', 'assado', 'assada', 'cortado', 'cortada',
             'fatiado', 'fatiada', 'amassado', 'amassada', 'desfiado', 'desfiada'],
}

const LIMIAR = { ingredienteMax: 80, metadadoMax: 60, vizinhoMax: 40 }

export const UNIDADES_CONHECIDAS = [
  'g', 'kg', 'ml', 'mL', 'l', 'litro', 'litros',
  'xíc', 'xícara', 'xícaras',
  'colher', 'colheres', 'colh.',
  'pitada', 'pitadas',
  'unid.', 'unidade', 'unidades',
  'lata', 'latas',
  'pacote', 'pacotes',
  'dente', 'dentes',
  'fatia', 'fatias',
  'ramo', 'ramos',
  'un.',
]

/* =========================================================================
   UTILITÁRIOS
   ========================================================================= */
const FRACOES_UNICODE = {
  '¼': '1/4', '½': '1/2', '¾': '3/4',
  '⅓': '1/3', '⅔': '2/3',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
}

function substituirFracoes(str) {
  for (const [frac, rep] of Object.entries(FRACOES_UNICODE)) {
    str = str.split(frac).join(rep)
  }
  return str
}

function normalizar(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/* =========================================================================
   CAMADA 3 — EXTRATORES (cada um aplica UMA regex, devolve dado cru)
   ========================================================================= */
function extrairQuantidade(texto) {
  const t = substituirFracoes(texto)
  const m = t.match(RE.quantidade)
  if (!m) return { valor: null, resto: t }
  return { valor: m[1].trim(), resto: t.slice(m[0].length) }
}

function extrairUnidade(texto) {
  const m = texto.match(RE.unidade)
  if (!m) return { valor: null, resto: texto }
  return { valor: m[1].trim(), resto: texto.slice(m[0].length) }
}

function extrairEmbalagem(texto) {
  const m = texto.match(RE.embalagem)
  if (!m) return { valor: null, resto: texto }
  return { valor: m[1].trim(), resto: texto.slice(m[0].length) }
}

/* =========================================================================
   CAMADA 4 — VALIDADORES (if/else relacionais; regex não expressa bem isso)
   ========================================================================= */
function validarQuantidadeUnidade(quantidade, unidade) {
  if (!quantidade || !unidade) return { ok: true }
  const temDecimal = /[.,]/.test(quantidade)
  const ehInteira = LEXICO.unidadesInteiras.includes(unidade.toLowerCase())
  if (temDecimal && ehInteira) {
    return { ok: false, motivo: `quantidade decimal ("${quantidade}") em unidade contável ("${unidade}")` }
  }
  return { ok: true }
}

function separarPreparoDoNome(nome) {
  const palavras = nome.trim().split(/\s+/)
  const ultima = palavras[palavras.length - 1].toLowerCase().replace(/[.,;]$/, '')
  if (palavras.length > 1 && LEXICO.preparos.includes(ultima)) {
    return { nome: palavras.slice(0, -1).join(' '), preparoSugerido: ultima }
  }
  return { nome: nome.trim(), preparoSugerido: null }
}

function casarPorToken(nomeNorm, alvoNorm) {
  const nTok = nomeNorm.split(/\s+/)
  const aTok = alvoNorm.split(/\s+/)
  for (let i = 0; i + aTok.length <= nTok.length; i++) {
    let bate = true
    for (let j = 0; j < aTok.length; j++) {
      if (nTok[i + j] !== aTok[j]) { bate = false; break }
    }
    if (bate) {
      const resto = [...nTok.slice(0, i), ...nTok.slice(i + aTok.length)]
        .join(' ').replace(/^[\s,]+|[\s,]+$/g, '').trim()
      return resto || null
    }
  }
  return undefined
}

function buscarMatch(nomeNorm, catalogo, grupoSubstituicao) {
  const candidatos = []

  for (const produto of catalogo) {
    const alvo = normalizar(produto.nome)
    if (alvo === nomeNorm) {
      candidatos.push({ tipo: 'produto', item: produto, observacao: null, peso: alvo.split(/\s+/).length, exato: true })
    } else {
      const obs = casarPorToken(nomeNorm, alvo)
      if (obs !== undefined) candidatos.push({ tipo: 'produto', item: produto, observacao: obs, peso: alvo.split(/\s+/).length, exato: false })
    }
  }
  for (const grupo of grupoSubstituicao) {
    const alvo = normalizar(grupo.nome)
    if (alvo === nomeNorm) {
      candidatos.push({ tipo: 'grupoSubstituicao', item: grupo, observacao: null, peso: alvo.split(/\s+/).length, exato: true })
    } else {
      const obs = casarPorToken(nomeNorm, alvo)
      if (obs !== undefined) candidatos.push({ tipo: 'grupoSubstituicao', item: grupo, observacao: obs, peso: alvo.split(/\s+/).length, exato: false })
    }
  }

  if (candidatos.length === 0) return null

  candidatos.sort((a, b) => {
    if (a.exato !== b.exato) return a.exato ? -1 : 1
    if (b.peso !== a.peso) return b.peso - a.peso
    if (a.tipo !== b.tipo) return a.tipo === 'produto' ? -1 : 1
    return 0
  })

  const m = candidatos[0]
  return { tipo: m.tipo, item: m.item, observacao: m.observacao }
}

/* =========================================================================
   PARSE DE UMA LINHA DE INGREDIENTE
   Orquestra extratores + validadores + match no catálogo
   ========================================================================= */
function parseLinhaIngrediente(linha, catalogo = [], grupoSubstituicao = []) {
  let resto = linha.trim()
  const avisos = []

  const q = extrairQuantidade(resto)
  resto = q.resto

  const u = extrairUnidade(resto)
  resto = u.resto

  let embalagem = null
  const e = extrairEmbalagem(resto.trim())
  if (e.valor) {
    embalagem = e.valor
    resto = e.resto
    avisos.push(`embalagem alternativa detectada: "${embalagem}"`)
  }

  let nome = resto.trim().replace(/^d[eaos]+\s+/i, '')

  if (RE.aGostoSufixo.test(nome)) {
    nome = nome.replace(RE.aGostoSufixo, '').trim()
  }

  const val = validarQuantidadeUnidade(q.valor, u.valor)
  if (!val.ok) avisos.push(val.motivo)

  const sep = separarPreparoDoNome(nome)
  let preparoSugerido = sep.preparoSugerido
  if (preparoSugerido) {
    nome = sep.nome
    avisos.push(`preparo "${preparoSugerido}" sugerido para OBS`)
  }

  if (!preparoSugerido) {
    const mUso = nome.match(RE.paraUsoSufixo)
    if (mUso) {
      preparoSugerido = mUso[1].trim()
      nome = nome.replace(RE.paraUsoSufixo, '').trim()
      avisos.push(`uso "${preparoSugerido}" sugerido para OBS`)
    }
  }

  const nomeNorm = normalizar(nome)
  const match = nome ? buscarMatch(nomeNorm, catalogo, grupoSubstituicao) : null

  const ingrediente = {
    nome,
    quantidade: q.valor || null,
    unidade: u.valor || null,
    observacao: preparoSugerido || null,
    embalagem,
    avisos,
    _parsedNome: nome,
    _parsedQuantidade: q.valor || null,
    _parsedUnidade: u.valor || null,
  }

  if (match) {
    if (match.tipo === 'produto') {
      ingrediente.produtoId = match.item.id || match.item.produtoId || null
      ingrediente.nome = match.item.nome
    } else if (match.tipo === 'grupoSubstituicao') {
      ingrediente.grupoSubstituicaoId = match.item.id || null
      ingrediente.nome = match.item.nome
    }
    if (match.observacao) ingrediente.observacao = match.observacao
  } else {
    ingrediente.nomeTemp = nome
  }

  return ingrediente
}

/* =========================================================================
   CLASSIFICADORES DE LINHA
   ========================================================================= */
function ehCabecalho(linha) {
  return RE.cabecalho.test(linha.trim()) || RE.subCabecalho.test(linha.trim())
}

function temCaraDeIngrediente(linha) {
  const t = substituirFracoes(linha).trim()
  if (t.length > LIMIAR.ingredienteMax) return false
  return RE.comecaNumero.test(t) || RE.comecaFracao.test(t)
}

/* =========================================================================
   METADADOS — tempo da RECEITA ≠ tempo de PASSO
   ========================================================================= */
function extrairTempoReceita(textoCompleto) {
  const m = textoCompleto.match(RE.tempoRotulado)
  if (!m) return null
  const valor = parseInt(m[1], 10)
  const ehHora = /h/i.test(m[2])
  return ehHora ? valor * 60 : valor
}

function extrairTemposDosPassos(passos) {
  return passos
    .map((passo, idx) => {
      const m = passo.match(RE.tempoMin)
      return m ? { passo: idx + 1, minutos: parseInt(m[1], 10), texto: passo } : null
    })
    .filter(Boolean)
}

function extrairMetadados(textoCompleto) {
  const meta = {}

  const tempo = extrairTempoReceita(textoCompleto)
  if (tempo !== null) meta.tempoPreparo = tempo

  const mP = textoCompleto.match(RE.porcoes)
  if (mP) meta.porcoes = parseInt(mP[1] || mP[2] || mP[3], 10)

  const mD = textoCompleto.match(RE.dificuldade)
  if (mD) {
    const d = normalizar(mD[0])
    if (d === 'facil') meta.dificuldade = 'fácil'
    else if (d === 'medio' || d === 'media') meta.dificuldade = 'médio'
    else if (d === 'dificil' || d.includes('dificil')) meta.dificuldade = 'difícil'
    else meta.dificuldade = d
  }

  return meta
}

/* =========================================================================
   CAMADA 5 — ORQUESTRAÇÃO
   Separa seções por cabeçalho; dentro de ingredientes promove vizinhos curtos.
   ========================================================================= */
export function parseReceita(texto, { catalogo = [], grupoSubstituicao = [] } = {}) {
  const linhas = texto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !RE.separador.test(l))

  const ingredientes = []
  const passos = []

  // Pré-classifica tipo e seção de cada linha em uma única varredura
  const ehIngredienteLinha = linhas.map(l => temCaraDeIngrediente(l))
  const ehCabecalhoLinha = linhas.map(l => ehCabecalho(l))

  // Heurística de vizinhança: linha curta (≤40) vizinha de ingrediente → promovida
  for (let i = 0; i < linhas.length; i++) {
    if (ehCabecalhoLinha[i] || ehIngredienteLinha[i]) continue
    if (linhas[i].length > LIMIAR.vizinhoMax) continue
    const vizinho = [-3, -2, -1, 1, 2, 3].some(d => {
      const j = i + d
      return j >= 0 && j < linhas.length && ehIngredienteLinha[j]
    })
    if (vizinho) ehIngredienteLinha[i] = true
  }

  const secaoDaLinha = []
  let secaoAtual = 'desconhecida'
  for (let i = 0; i < linhas.length; i++) {
    if (ehCabecalhoLinha[i]) {
      if (/ingrediente/i.test(linhas[i])) secaoAtual = 'ingredientes'
      else if (/preparo|passo|instru|como fazer|modo/i.test(linhas[i])) secaoAtual = 'preparo'
    }
    secaoDaLinha[i] = secaoAtual
  }

  const consumidos = new Set()

  linhas.forEach((linha, i) => {
    if (consumidos.has(i)) return
    if (linha.trim().length === 0) return
    if (ehCabecalhoLinha[i]) return

    if (secaoDaLinha[i] === 'preparo') {
      const passo = linha
        .replace(RE.numeracaoPasso, '')
        .replace(RE.numeracaoSimples, '')
        .trim()
      if (passo) passos.push(passo)
      return
    }

    if (ehIngredienteLinha[i]) {
      ingredientes.push(parseLinhaIngrediente(linha, catalogo, grupoSubstituicao))
    }
  })

  const meta = extrairMetadados(texto)
  const timersDePasso = extrairTemposDosPassos(passos)

  return {
    nome: '',
    tempoPreparo: meta.tempoPreparo || null,
    porcoes: meta.porcoes || null,
    dificuldade: meta.dificuldade || null,
    ingredientes,
    passos,
    _timersDePasso: timersDePasso,
  }
}