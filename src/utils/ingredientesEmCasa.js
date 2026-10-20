// Regra única de "esse ingrediente está em casa?", usada pelo detalhe da
// receita, pelo cartão da lista ("faltam N de M") e pela ordenação por
// relevância — antes cada um tinha a sua e elas discordavam.

function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

// Monta uma vez por render e devolve a função que testa cada ingrediente.
// `itensEmCasa` são os itens da lista com comprado=true (já cruzados com o
// catálogo, então trazem grupoSubstituicao).
export function criarVerificadorEmCasa(itensEmCasa, catalogo = []) {
  const idsEmCasa = new Set(itensEmCasa.map((i) => i.produtoId))
  const gruposEmCasa = new Set(
    itensEmCasa.flatMap((i) => (i.grupoSubstituicao ?? []).map(normalizar))
  )
  const gruposDoProduto = new Map(catalogo.map((p) => [p.id, p.grupoSubstituicao ?? []]))

  return (ing) => {
    // Produto ainda não catalogado: não há como saber.
    if (ing.nomeTemp) return false
    // Ingrediente que já é um grupo (ex: "óleo"): o nome é o do grupo.
    if (ing.grupoSubstituicaoId) return gruposEmCasa.has(normalizar(ing.nome))
    if (!ing.produtoId) return false
    if (idsEmCasa.has(ing.produtoId)) return true
    // Produto genérico vale pelo grupo dele: a receita pede "Óleo" e em casa
    // tem "Óleo de girassol" — se os dois estão no grupo "óleo", conta.
    return (gruposDoProduto.get(ing.produtoId) ?? []).some((g) => gruposEmCasa.has(normalizar(g)))
  }
}

// Ingredientes que faltam. Os sem cadastro (nomeTemp) não entram: não dá para
// marcá-los em casa, então contariam como faltando para sempre.
export function ingredientesFaltantes(receita, temEmCasa) {
  return (receita.ingredientes ?? []).filter((ing) => !ing.nomeTemp && !temEmCasa(ing))
}
