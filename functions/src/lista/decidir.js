// O que fazer na lista da casa quando alguém de fora do app (o nutreai) pede
// "coloca X para comprar". Função pura: recebe o catálogo e os itens da lista
// e devolve a decisão; quem grava é listaNutreai.js.
//
// Mesmo formato do app (src/hooks/useLista.js): item = { produtoId, comprado },
// comprado:true = tem em casa, comprado:false = para comprar.
//   - algum item do produto já está para comprar → nada ("ja_na_lista");
//   - senão, algum em casa → esse item passa a "para comprar" (um só, mesmo
//     com itens duplicados de sobra);
//   - senão → cria { produtoId, comprado: false }.
// Produto genérico (generico: true, ex.: "Óleo") não entra na lista; vai uma
// variante do mesmo grupoSubstituicao, como o "Adicionar faltantes" das
// receitas (src/utils/ingredientesEmCasa.js):
//   - alguma variante já para comprar → nada;
//   - senão, variante em casa (a que acabou) → passa a "para comprar";
//   - senão, a variante com mais preços registrados por esta casa;
//   - sem nenhuma pista → "generico_sem_variante" (a pessoa escolhe no app).

const simplificar = (t) =>
  String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function variantesDe(produto, catalogo) {
  const grupos = new Set((produto.grupoSubstituicao ?? []).map(simplificar));
  return catalogo.filter(
    (p) => p.id !== produto.id && !p.generico && (p.grupoSubstituicao ?? []).some((g) => grupos.has(simplificar(g))),
  );
}

const comprasDaCasa = (produto, listaAtiva) =>
  (produto.historico ?? []).filter((h) => h.listaAtiva === listaAtiva).length;

// Decisão para um produto comum (não genérico).
function decidirProduto(produto, itens) {
  const doProduto = itens.filter((i) => i.produtoId === produto.id);
  if (doProduto.some((i) => i.comprado === false)) return { acao: "nada", produto, status: "ja_na_lista" };
  const emCasa = doProduto.find((i) => i.comprado === true);
  if (emCasa) return { acao: "desmarcar", produto, itemId: emCasa.id, status: "comprar" };
  return { acao: "criar", produto, status: "comprar" };
}

/**
 * @param {object|null} produto   catalogo/{id} com id (null = não existe)
 * @param {Array} catalogo        todos os produtos (só é lido para genéricos)
 * @param {Array<{id, produtoId, comprado}>} itens  itens da lista da casa
 * @param {string} listaAtiva
 * @returns {{ acao: "criar"|"desmarcar"|"nada", produto?, itemId?, status }}
 */
export function decidirPedido(produto, catalogo, itens, listaAtiva) {
  if (!produto) return { acao: "nada", status: "nao_existe" };
  if (!produto.generico) return decidirProduto(produto, itens);

  const variantes = variantesDe(produto, catalogo);
  const idsVariantes = new Set(variantes.map((v) => v.id));
  const daLista = itens.filter((i) => idsVariantes.has(i.produtoId));
  const paraComprar = daLista.find((i) => i.comprado === false);
  if (paraComprar) {
    return { acao: "nada", produto: variantes.find((v) => v.id === paraComprar.produtoId), status: "ja_na_lista" };
  }
  const maisComprada = (lista) =>
    lista.slice().sort((a, b) => comprasDaCasa(b, listaAtiva) - comprasDaCasa(a, listaAtiva))[0];

  const emCasa = variantes.filter((v) => daLista.some((i) => i.produtoId === v.id && i.comprado === true));
  if (emCasa.length) return decidirProduto(maisComprada(emCasa), itens);

  const comHistorico = variantes.filter((v) => comprasDaCasa(v, listaAtiva) > 0);
  if (comHistorico.length) return decidirProduto(maisComprada(comHistorico), itens);
  return { acao: "nada", status: "generico_sem_variante" };
}

export const ID_VALIDO = /^[A-Za-z0-9_-]{1,128}$/;
export const MAX_ITENS = 20;

/** Lê o corpo { itens: [{ produtoId, nome? }] }; devolve a lista ou null se inválido. */
export function lerCorpo(corpo) {
  const itens = corpo?.itens;
  if (!Array.isArray(itens) || itens.length < 1 || itens.length > MAX_ITENS) return null;
  if (!itens.every((i) => i && typeof i === "object" && typeof i.produtoId === "string")) return null;
  return itens.map((i) => ({ produtoId: i.produtoId, nome: typeof i.nome === "string" ? i.nome : null }));
}
