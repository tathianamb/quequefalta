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

// Produtos que compartilham algum grupo com `produto` (sem ele mesmo e sem
// outros genéricos).
function variantesDe(produto, catalogo) {
  const grupos = new Set((produto.grupoSubstituicao ?? []).map(normalizar))
  return catalogo.filter((p) =>
    p.id !== produto.id && !p.generico && (p.grupoSubstituicao ?? []).some((g) => grupos.has(normalizar(g)))
  )
}

// Ingrediente genérico ("Óleo") não entra na lista de compras: no lugar dele
// vai uma variante. Devolve:
//   { jaNaLista: true }  — alguma variante já está na lista (a comprar);
//   { variante }         — a variante com mais preços registrados por esta casa;
//   {}                   — nenhuma pista: o usuário escolhe no catálogo.
export function escolherVariante(produto, catalogo, lista, listaAtiva) {
  const variantes = variantesDe(produto, catalogo)
  const idsNaLista = new Set(lista.map((i) => i.produtoId))
  if (variantes.some((v) => idsNaLista.has(v.id))) return { jaNaLista: true }

  const comprasDaCasa = (v) => (v.historico ?? []).filter((h) => h.listaAtiva === listaAtiva).length
  const [melhor] = variantes
    .map((v) => ({ v, n: comprasDaCasa(v) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  return melhor ? { variante: melhor.v } : {}
}

// Ingredientes que faltam. Os sem cadastro (nomeTemp) não entram: não dá para
// marcá-los em casa, então contariam como faltando para sempre.
export function ingredientesFaltantes(receita, temEmCasa) {
  return (receita.ingredientes ?? []).filter((ing) => !ing.nomeTemp && !temEmCasa(ing))
}
