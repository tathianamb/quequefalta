// Parser client-side de receita em texto livre.
// Sem dependências externas.

export const UNIDADES_CONHECIDAS = [
  'g', 'kg', 'mg',
  'ml', 'l', 'litro', 'litros',
  'xíc', 'xic', 'xícara', 'xicaras', 'xícaras',
  'colh', 'col', 'colher', 'colheres',
  'colh.', 'col.', 'colh.sopa', 'colh.chá',
  'cs', 'cc',
  'pitada', 'pitadas',
  'unid', 'unid.', 'unidade', 'unidades',
  'lata', 'latas',
  'pacote', 'pacotes',
  'dente', 'dentes',
  'fatia', 'fatias',
  'folha', 'folhas',
  'ramo', 'ramos',
  'cubo', 'cubos',
  'dose', 'doses',
  'a gosto',
  'und', 'un',
  'copo', 'copos',
  'sachê', 'sache',
  'caixinha', 'caixa',
  'tablete', 'tabletes',
  'fio', 'fios',
  'pedaço', 'pedaços',
  'fatia', 'fatias',
  'punhado', 'punhados',
]

// Unidades normalizadas para regex (sem acentos, lowercase)
const _UNIDADES_NORM = UNIDADES_CONHECIDAS.map(u =>
  u.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
)

// Frações unicode → decimal
const FRACOES_UNICODE = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
}

function normalizar(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Converte fração texto ("1/2", "3/4") para número decimal */
function fracaoParaNumero(str) {
  const m = str.match(/^(\d+)\/(\d+)$/)
  if (m) return parseInt(m[1], 10) / parseInt(m[2], 10)
  return null
}

/** Substitui frações unicode por sua representação texto */
function substituirFracoes(str) {
  for (const [frac, rep] of Object.entries(FRACOES_UNICODE)) {
    str = str.split(frac).join(rep)
  }
  return str
}

/**
 * Tenta extrair quantidade e unidade do início de uma string de ingrediente.
 * Retorna { quantidade, unidade, resto }.
 */
function extrairQuantidadeUnidade(linha) {
  linha = substituirFracoes(linha).trim()

  // Regex: opcional número inteiro + opcional fração, ou só fração
  // Exemplos: "2", "1/2", "1 1/2", "2,5", "2.5"
  const reQtd = /^(\d+\/\d+|\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?)\s*/
  let resto = linha
  let quantidadeRaw = null

  const mQtd = resto.match(reQtd)
  if (mQtd) {
    quantidadeRaw = mQtd[1].trim()
    resto = resto.slice(mQtd[0].length)
  }

  // Tentar casar unidade (próxima palavra ou "a gosto")
  const reUnidade = new RegExp(
    '^(' +
      // "a gosto" primeiro (frase composta)
      'a\\s+gosto|' +
      // unidades conhecidas (escapar pontos)
      _UNIDADES_NORM
        .filter(u => u !== 'a gosto')
        .map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .sort((a, b) => b.length - a.length) // mais longas primeiro
        .join('|') +
    ')(?:\\s+de\\s+|\\s+do\\s+|\\s+da\\s+|\\s+dos\\s+|\\s+das\\s+|\\.|\\s|$)',
    'i'
  )

  let unidadeRaw = null
  const linhaParaUnidade = normalizar(resto)
  const mUnidade = linhaParaUnidade.match(reUnidade)
  if (mUnidade) {
    unidadeRaw = resto.slice(0, mUnidade[1].length).trim()
    resto = resto.slice(mUnidade[0].length).trim()
  }

  // Remover preposições do início do resto
  resto = resto.replace(/^(de|do|da|dos|das)\s+/i, '').trim()

  return {
    quantidade: quantidadeRaw,
    unidade: unidadeRaw,
    resto,
  }
}

/** Verifica se uma linha parece ser um ingrediente */
function ehIngrediente(linhaOriginal) {
  const linha = substituirFracoes(linhaOriginal).trim()

  // Linhas muito longas (>80 chars) quase certamente são passos de preparo
  if (linha.length > 80) return false

  // Começa com número
  if (/^\d/.test(linha)) return true

  // Começa com fração unicode
  if (/^[¼½¾⅓⅔⅛⅜⅝⅞]/.test(linhaOriginal)) return true

  // Contém unidade conhecida no início (até 3ª palavra), não no meio de uma frase
  const norm = normalizar(linha)
  const palavras = norm.split(/\s+/)
  // Unidades de medida que podem aparecer sozinhas como ingrediente ("sal a gosto")
  for (const u of _UNIDADES_NORM) {
    const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // A unidade deve estar nas primeiras 3 palavras (posição inicial/após quantidade)
    const re = new RegExp(`^(?:\\S+\\s+){0,2}${escaped}(?:\\s|\\.|,|$)`, 'i')
    if (re.test(norm)) return true
  }

  return false
}

/** Detecta metadados de tempo, porções e dificuldade em uma linha */
function detectarMetadados(linha) {
  const result = {}
  const norm = normalizar(linha)

  // Tempo: "1h30", "1h30min", "1 hora e 30 minutos", "30 minutos", "30 min", "1 hora"
  const reTempoCompleto =
    /(\d+)\s*h(?:ora)?s?\s*(?:e\s*)?(?:(\d+)\s*min(?:uto)?s?)?/i
  const reTempoMin = /(\d+)\s*min(?:uto)?s?/i

  const mHora = norm.match(reTempoCompleto)
  if (mHora) {
    const horas = parseInt(mHora[1], 10)
    const minutos = mHora[2] ? parseInt(mHora[2], 10) : 0
    result.tempoPreparo = horas * 60 + minutos
  } else {
    const mMin = norm.match(reTempoMin)
    if (mMin) {
      result.tempoPreparo = parseInt(mMin[1], 10)
    }
  }

  // Porções: "4 porções", "4 pessoas", "serve 4", "rende 4", "servem 4", "rendem 4"
  const rePorcoes =
    /(\d+)\s*(?:por[cç][õo]es?|pessoas?|serve[m]?|rende[m]?)|(?:serve[m]?|rende[m]?)\s+(\d+)/i
  const mPorc = norm.match(rePorcoes)
  if (mPorc) {
    result.porcoes = parseInt(mPorc[1] || mPorc[2], 10)
  }

  // Dificuldade
  const reDific = /f[aá]cil|m[eé]dio|m[eé]dia|dif[ií]cil/i
  const mDific = norm.match(reDific)
  if (mDific) {
    // Retornar em forma canônica
    const d = normalizar(mDific[0])
    if (d === 'facil') result.dificuldade = 'fácil'
    else if (d === 'medio' || d === 'media') result.dificuldade = 'médio'
    else if (d === 'dificil') result.dificuldade = 'difícil'
  }

  return result
}

/** Verifica se a linha é um cabeçalho de seção (a ser ignorado como passo) */
function ehCabecalho(linha) {
  const norm = normalizar(linha)
  // Cabeçalho pode ter complemento: "Ingredientes (8 porções)", "Modo de preparo:"
  return /^(modo de preparo|ingredientes|preparo|instrucoes|instrucao|receita|como fazer)(\s*[\(:,].*)?$/.test(
    norm
  )
}

/** Verifica se a linha é um separador visual */
function ehSeparador(linha) {
  return /^[-=*_]{3,}\s*$/.test(linha.trim())
}

/** Tenta remover numeração de passo do início: "1.", "1)", "Passo 1:", "Step 1:" */
function removerNumeracaoPasso(linha) {
  return linha
    .replace(/^\s*(?:passo|step|etapa)\s+\d+\s*[:\-.)]\s*/i, '')
    .replace(/^\s*\d+\s*[:.)\-]\s*/, '')
    .trim()
}

/**
 * Busca match de um nome de ingrediente no catálogo e nos atributos.
 * Prioridade: produto exato > produto contains > atributo exato > atributo contains
 * Retorna { tipo, item, observacao } onde observacao é o texto que sobrou após o match.
 */
function buscarMatch(nomeNorm, catalogo, atributos) {
  // Match exato no catálogo
  for (const produto of catalogo) {
    const prodNorm = normalizar(produto.nome)
    if (prodNorm === nomeNorm) {
      return { tipo: 'produto', item: produto, observacao: null }
    }
  }

  // Match por contains no catálogo: ingrediente contém o nome do produto
  // Só aceitar se o produto tiver 2+ palavras (evita falso positivo com produtos genéricos de 1 palavra)
  for (const produto of catalogo) {
    const prodNorm = normalizar(produto.nome)
    const palavrasProd = prodNorm.split(/\s+/).length
    if (nomeNorm.includes(prodNorm) && palavrasProd >= 2) {
      const obs = nomeNorm.replace(prodNorm, '').replace(/^[\s,]+|[\s,]+$/g, '') || null
      return { tipo: 'produto', item: produto, observacao: obs }
    }
  }

  // Match exato nos atributos
  for (const atributo of atributos) {
    if (normalizar(atributo.nome) === nomeNorm) {
      return { tipo: 'atributo', item: atributo, observacao: null }
    }
  }

  // Match por contains nos atributos (mesmo critério: 2+ palavras)
  for (const atributo of atributos) {
    const atrNorm = normalizar(atributo.nome)
    const palavrasAtr = atrNorm.split(/\s+/).length
    if (nomeNorm.includes(atrNorm) && palavrasAtr >= 2) {
      const obs = nomeNorm.replace(atrNorm, '').replace(/^[\s,]+|[\s,]+$/g, '') || null
      return { tipo: 'atributo', item: atributo, observacao: obs }
    }
  }

  return null
}

/**
 * Parseia texto livre de receita e retorna dados estruturados.
 *
 * @param {string} texto - Texto bruto da receita
 * @param {{ catalogo?: object[], atributos?: object[] }} opcoes
 * @returns {{ nome, tempoPreparo, porcoes, dificuldade, ingredientes, passos }}
 */
export function parseReceita(texto, { catalogo = [], atributos = [] } = {}) {
  // Dividir em linhas e filtrar vazias/separadores
  const linhas = texto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !ehSeparador(l))

  let nome = ''
  let tempoPreparo = null
  let porcoes = null
  let dificuldade = null
  const ingredientes = []
  const passos = []

  // Conjunto de índices já consumidos
  const consumidos = new Set()

  // Passagem 1: detectar metadados em todas as linhas
  // e marcar quais linhas são de ingrediente
  const ehIngredienteLinha = linhas.map(l => ehIngrediente(l))
  const ehCabecalhoLinha = linhas.map(l => ehCabecalho(l))

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]

    // Linhas longas (>80 chars) são passos de preparo — não extrair metadados delas
    // para não consumir a linha indevidamente
    if (linha.length > 80) continue

    const meta = detectarMetadados(linha)
    // Só marcar linha como consumida se ela for curta/dedicada a metadado
    // (não é ingrediente, não é cabeçalho, e tem até 60 chars)
    const linhaDeMetadado = !ehIngredienteLinha[i] && !ehCabecalhoLinha[i] && linha.length <= 60
    if (meta.tempoPreparo != null && tempoPreparo == null) {
      tempoPreparo = meta.tempoPreparo
      if (linhaDeMetadado) consumidos.add(i)
    }
    if (meta.porcoes != null && porcoes == null) {
      porcoes = meta.porcoes
      if (linhaDeMetadado) consumidos.add(i)
    }
    if (meta.dificuldade != null && dificuldade == null) {
      dificuldade = meta.dificuldade
      if (linhaDeMetadado) consumidos.add(i)
    }
  }

  // Passagem 2: promover ingredientes "sem quantidade" por contexto de vizinhança
  // Deve rodar ANTES da detecção do nome para não capturar ingredientes como título
  // Linha curta (≤40 chars), não consumida, não cabeçalho, vizinha de ingrediente
  for (let i = 0; i < linhas.length; i++) {
    if (consumidos.has(i)) continue
    if (ehCabecalhoLinha[i]) continue
    if (ehIngredienteLinha[i]) continue
    if (linhas[i].length > 40) continue
    const vizinhoIngrediente = [-3,-2,-1,1,2,3].some(d => {
      const j = i + d
      return j >= 0 && j < linhas.length && ehIngredienteLinha[j]
    })
    if (vizinhoIngrediente) {
      ehIngredienteLinha[i] = true
    }
  }

  // Passagem 3a: detectar nome (primeira linha não consumida, não ingrediente, não cabeçalho)
  for (let i = 0; i < linhas.length; i++) {
    if (consumidos.has(i)) continue
    const linha = linhas[i]
    if (!ehIngredienteLinha[i] && !ehCabecalhoLinha[i] && linha.length <= 60 && !/\d/.test(linha.slice(0, 3))) {
      nome = linha
      consumidos.add(i)
      break
    }
  }

  // Passagem 3b: processar ingredientes
  for (let i = 0; i < linhas.length; i++) {
    if (consumidos.has(i)) continue
    if (!ehIngredienteLinha[i]) continue

    const linhaOriginal = linhas[i]
    const { quantidade, unidade, resto } = extrairQuantidadeUnidade(linhaOriginal)
    const nomeIngrediente = resto.trim()

    // Montar ingrediente
    const nomeNorm = normalizar(nomeIngrediente)
    const match = nomeIngrediente ? buscarMatch(nomeNorm, catalogo, atributos) : null

    const ingrediente = {
      nome: nomeIngrediente,
      quantidade: quantidade || null,
      unidade: unidade || null,
      observacao: null,
      _parsedNome: nomeIngrediente,
      _parsedQuantidade: quantidade || null,
      _parsedUnidade: unidade || null,
    }

    if (match) {
      if (match.tipo === 'produto') {
        ingrediente.produtoId = match.item.id || match.item.produtoId || null
        ingrediente.nome = match.item.nome
      } else {
        ingrediente.atributoId = match.item.id || match.item.atributoId || null
        ingrediente.nome = match.item.nome
      }
      if (match.observacao) ingrediente.observacao = match.observacao
    } else {
      ingrediente.nomeTemp = nomeIngrediente
    }

    ingredientes.push(ingrediente)
    consumidos.add(i)
  }

  // Passagem 4: linhas restantes não consumidas → passos
  for (let i = 0; i < linhas.length; i++) {
    if (consumidos.has(i)) continue
    if (ehCabecalhoLinha[i]) continue

    const passo = removerNumeracaoPasso(linhas[i])
    if (passo) {
      passos.push(passo)
    }
  }

  return {
    nome,
    tempoPreparo,
    porcoes,
    dificuldade,
    ingredientes,
    passos,
  }
}
