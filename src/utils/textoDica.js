// Formatação leve para o texto das dicas — um subconjunto de Markdown que dá
// pra digitar no celular sem pensar:
//   # Título / ## Subtítulo   → subtítulo
//   - item  /  * item         → lista com marcadores
//   1. item                   → lista numerada
//   **negrito**               → negrito
//   [texto](https://...)      → link
//   https://... solto         → link
//   linha em branco           → novo parágrafo

const RE_TITULO = /^#{1,3}\s+(.*)$/
const RE_MARCADOR = /^[-*•]\s+(.*)$/
const RE_NUMERO = /^\d+[.)]\s+(.*)$/

/**
 * Quebra o texto em blocos: { tipo: 'titulo' | 'paragrafo', texto }
 * ou { tipo: 'lista' | 'numerada', itens: [] }.
 */
export function blocosDoTexto(texto = '') {
  const blocos = []
  let paragrafo = []

  const fecharParagrafo = () => {
    if (paragrafo.length) blocos.push({ tipo: 'paragrafo', texto: paragrafo.join('\n') })
    paragrafo = []
  }

  for (const bruta of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const linha = bruta.trim()
    let m

    if (!linha) {
      fecharParagrafo()
    } else if ((m = linha.match(RE_TITULO))) {
      fecharParagrafo()
      blocos.push({ tipo: 'titulo', texto: m[1] })
    } else if ((m = linha.match(RE_MARCADOR)) || (m = linha.match(RE_NUMERO))) {
      fecharParagrafo()
      const tipo = RE_MARCADOR.test(linha) ? 'lista' : 'numerada'
      const ultimo = blocos[blocos.length - 1]
      if (ultimo?.tipo === tipo) ultimo.itens.push(m[1])
      else blocos.push({ tipo, itens: [m[1]] })
    } else {
      paragrafo.push(linha)
    }
  }
  fecharParagrafo()
  return blocos
}

// Só http(s) vira link — nunca javascript: ou outros esquemas.
const RE_TRECHO = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/\S+)/g

/**
 * Divide uma linha em trechos { texto, negrito?, href?, solto? }.
 * `solto` marca um endereço colado direto no texto (sem [texto](...)).
 */
export function trechosDaLinha(linha) {
  const trechos = []
  let ultimo = 0
  for (const m of linha.matchAll(RE_TRECHO)) {
    if (m.index > ultimo) trechos.push({ texto: linha.slice(ultimo, m.index) })
    if (m[1]) {
      trechos.push({ texto: m[1], negrito: true })
    } else if (m[2]) {
      trechos.push({ texto: m[2], href: m[3] })
    } else {
      // Pontuação colada no fim ("veja https://x.com.") não faz parte do link.
      const sobra = m[4].match(/[.,;:!?)]+$/)?.[0] ?? ''
      const url = m[4].slice(0, m[4].length - sobra.length)
      trechos.push({ texto: url.replace(/^https?:\/\//, '').replace(/\/$/, ''), href: url, solto: true })
      if (sobra) trechos.push({ texto: sobra })
    }
    ultimo = m.index + m[0].length
  }
  if (ultimo < linha.length) trechos.push({ texto: linha.slice(ultimo) })
  return trechos
}

/** Texto corrido sem marcações, para o resumo no card. */
export function resumoDoTexto(texto = '', max = 140) {
  // Prefere os parágrafos (a introdução); subtítulos e listas só entram se a
  // dica não tiver nenhum parágrafo.
  const blocos = blocosDoTexto(texto)
  const paragrafos = blocos.filter(b => b.tipo === 'paragrafo')
  const semMarcacao = (t) => trechosDaLinha(t).filter(x => !x.solto).map(x => x.texto).join('')
  const plano = (paragrafos.length ? paragrafos : blocos)
    .map(b => (b.itens ? b.itens.map(semMarcacao).join(' · ') : semMarcacao(b.texto)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plano.length > max ? `${plano.slice(0, max).trimEnd()}…` : plano
}

/** "7 de out. de 2026" a partir de um Timestamp do Firestore. */
export function dataDaDica(ts) {
  const data = ts?.toDate?.()
  if (!data) return ''
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}
