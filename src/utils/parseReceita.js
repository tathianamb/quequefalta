import { normalizar } from './texto'

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
  // Termos de preparo que colados ao fim do nome devem ir para OBS
  preparos: ['picado', 'picados', 'picada', 'picadas', 'ralado', 'ralada',
             'cozido', 'cozida', 'cozidos', 'cozidas', 'fresco', 'fresca',
             'frito', 'frita', 'assado', 'assada', 'cortado', 'cortada',
             'fatiado', 'fatiada', 'amassado', 'amassada', 'desfiado', 'desfiada'],
}

const LIMIAR = { ingredienteMax: 80, vizinhoMax: 40 }

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

function buscarMatch(nomeNorm, catalogo) {
  const candidatos = []

  for (const produto of catalogo) {
    const alvo = normalizar(produto.nome)
    if (alvo === nomeNorm) {
      candidatos.push({ item: produto, observacao: null, peso: alvo.split(/\s+/).length, exato: true })
    } else {
      const obs = casarPorToken(nomeNorm, alvo)
      if (obs !== undefined) candidatos.push({ item: produto, observacao: obs, peso: alvo.split(/\s+/).length, exato: false })
    }
  }

  if (candidatos.length === 0) return null

  candidatos.sort((a, b) => {
    if (a.exato !== b.exato) return a.exato ? -1 : 1
    return b.peso - a.peso
  })

  const m = candidatos[0]
  return { item: m.item, observacao: m.observacao }
}

/* =========================================================================
   PARSE DE UMA LINHA DE INGREDIENTE
   Orquestra extratores + validadores + match no catálogo
   ========================================================================= */
function parseLinhaIngrediente(linha, catalogo) {
  let resto = linha.trim()

  const q = extrairQuantidade(resto)
  resto = q.resto

  const u = extrairUnidade(resto)
  resto = u.resto

  const e = extrairEmbalagem(resto.trim())
  if (e.valor) resto = e.resto

  let nome = resto.trim().replace(/^d[eaos]+\s+/i, '')

  if (RE.aGostoSufixo.test(nome)) {
    nome = nome.replace(RE.aGostoSufixo, '').trim()
  }

  const sep = separarPreparoDoNome(nome)
  let preparoSugerido = sep.preparoSugerido
  if (preparoSugerido) nome = sep.nome

  if (!preparoSugerido) {
    const mUso = nome.match(RE.paraUsoSufixo)
    if (mUso) {
      preparoSugerido = mUso[1].trim()
      nome = nome.replace(RE.paraUsoSufixo, '').trim()
    }
  }

  const nomeNorm = normalizar(nome)
  const match = nome ? buscarMatch(nomeNorm, catalogo) : null

  const ingrediente = {
    nome,
    quantidade: q.valor || null,
    unidade: u.valor || null,
    observacao: preparoSugerido || null,
  }

  if (match) {
    ingrediente.produtoId = match.item.id || match.item.produtoId || null
    ingrediente.nome = match.item.nome
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
export function parseReceita(texto, { catalogo }) {
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

  linhas.forEach((linha, i) => {
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
      ingredientes.push(parseLinhaIngrediente(linha, catalogo))
    }
  })

  const meta = extrairMetadados(texto)

  return {
    nome: '',
    tempoPreparo: meta.tempoPreparo || null,
    porcoes: meta.porcoes || null,
    dificuldade: meta.dificuldade || null,
    ingredientes,
    passos,
  }
}