// Sugestões para a próxima compra a partir do que a casa comprou nos
// últimos JANELA_DIAS. Cada registro do `historico` com o `listaAtiva` da
// casa conta como uma compra; registros do mesmo mercado no mesmo dia formam
// uma "ida".
//
// Um produto é sugerido (já marcado) quando é recorrente: apareceu em 2 ou
// mais idas, ou numa ida grande (IDA_GRANDE_ITENS produtos ou mais, que é a
// compra planejada). Comprado uma vez só, numa ida pequena, é tratado como
// avulso (ex: passou no mercado para comprar carne e voltou com biscoito) —
// aparece numa seção separada, desmarcado.
import { chaveMercado, dataDoRegistro, ondeComprar } from "./precos";

export const JANELA_DIAS = 60;
export const IDA_GRANDE_ITENS = 8;

const DIA_MS = 24 * 60 * 60 * 1000;

// Dia local da compra (o bot grava as datas ao meio-dia, longe da virada).
function diaIso(data) {
  return `${data.getFullYear()}-${data.getMonth() + 1}-${data.getDate()}`;
}

/**
 * @param {{ catalogo: Array, listaAtiva: string, lista: Array, hoje?: Date }} args
 * @returns {{ recorrentes: Array, avulsos: Array, idas: number }}
 *   cada sugestão: { produto, idas, idaGrande, emCasa, itemLista, onde }
 */
export function montarSugestoesDoMes({ catalogo, listaAtiva, lista, hoje = new Date() }) {
  if (!listaAtiva) return { recorrentes: [], avulsos: [], idas: 0 };
  const limite = hoje.getTime() - JANELA_DIAS * DIA_MS;

  // ida ("mercado|dia") → produtos distintos comprados nela
  const idas = new Map();
  // produtoId → idas em que apareceu
  const idasDoProduto = new Map();

  for (const produto of catalogo) {
    if (produto.generico) continue;
    for (const h of produto.historico || []) {
      if (h.listaAtiva !== listaAtiva) continue;
      const data = dataDoRegistro(h);
      if (!data || data.getTime() < limite || !h.mercado) continue;
      const ida = `${chaveMercado(h.mercado)}|${diaIso(data)}`;
      if (!idas.has(ida)) idas.set(ida, new Set());
      idas.get(ida).add(produto.id);
      if (!idasDoProduto.has(produto.id)) idasDoProduto.set(produto.id, new Set());
      idasDoProduto.get(produto.id).add(ida);
    }
  }

  const itemPorProduto = new Map(lista.map((i) => [i.produtoId, i]));
  const recorrentes = [];
  const avulsos = [];

  for (const produto of catalogo) {
    const idasProduto = idasDoProduto.get(produto.id);
    if (!idasProduto) continue;
    const itemLista = itemPorProduto.get(produto.id);
    // Já está na lista para comprar: nada a sugerir.
    if (itemLista && !itemLista.comprado) continue;

    const idaGrande = [...idasProduto].some((ida) => idas.get(ida).size >= IDA_GRANDE_ITENS);
    const sugestao = {
      produto,
      idas: idasProduto.size,
      idaGrande,
      emCasa: !!itemLista?.comprado,
      itemLista: itemLista || null,
      onde: ondeComprar(produto, hoje),
    };
    if (idasProduto.size >= 2 || idaGrande) recorrentes.push(sugestao);
    else avulsos.push(sugestao);
  }

  const ordenar = (a, b) => b.idas - a.idas || a.produto.nome.localeCompare(b.produto.nome, "pt-BR");
  recorrentes.sort(ordenar);
  avulsos.sort(ordenar);
  return { recorrentes, avulsos, idas: idas.size };
}
