// Formatação leve para o texto das dicas — um subconjunto de Markdown que dá
// pra digitar no celular sem pensar:
//   # Título / ## Subtítulo   → subtítulo
//   - item  /  * item         → lista com marcadores
//   1. item                   → lista numerada
//   **negrito**               → negrito
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

/** Divide uma linha em trechos { texto, negrito } a partir de **...**. */
export function trechosDaLinha(linha) {
  return linha
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map(t => (t.startsWith('**') && t.endsWith('**') && t.length > 4
      ? { texto: t.slice(2, -2), negrito: true }
      : { texto: t, negrito: false }))
}

/** Texto corrido sem marcações, para o resumo no card. */
export function resumoDoTexto(texto = '', max = 140) {
  // Prefere os parágrafos (a introdução); subtítulos e listas só entram se a
  // dica não tiver nenhum parágrafo.
  const blocos = blocosDoTexto(texto)
  const paragrafos = blocos.filter(b => b.tipo === 'paragrafo')
  const plano = (paragrafos.length ? paragrafos : blocos)
    .map(b => (b.itens ? b.itens.join(' · ') : b.texto))
    .join(' ')
    .replace(/\*\*/g, '')
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
