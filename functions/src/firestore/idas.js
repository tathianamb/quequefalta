import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Planejado × comprado de cada ida ao mercado (idasMercado/{loteId}).
// Compara a nota recém-confirmada com a lista da casa ANTES de o bot marcar os
// itens como "tem em casa":
// - compradosDaLista: produtos da nota que estavam na lista a comprar;
// - extras: o resto da nota (fora da lista, recompra do que já tinha em casa,
//   ou item sem produto no catálogo);
// - esquecidos: o que estava na lista a comprar e não veio. A lista é uma só
//   para todos os mercados, então isso inclui o que ficou para outro mercado.
// Só vale para nota recente (a lista de agora representa o plano daquela ida).

function valorDaLinha({ total, preco, quantidade }) {
  if (Number.isFinite(total)) return total;
  if (Number.isFinite(preco) && Number.isFinite(quantidade)) return preco * quantidade;
  return Number.isFinite(preco) ? preco : 0;
}

const centavos = (n) => Math.round(n * 100) / 100;

/**
 * @param {{ loteId: string, uid: string, listaAtiva: string, mercado: string, data: string,
 *   linhas: Array<{ produtoId: string|null, nome: string, preco: number, quantidade: number|null, total: number|null }> }} args
 * @returns {Promise<object|null>} o resumo gravado, ou null quando não há o que comparar.
 */
export async function registrarIda({ loteId, uid, listaAtiva, mercado, data, linhas }) {
  if (!listaAtiva || !linhas.length) return null;
  const db = getFirestore();

  const snapLista = await db.collection("listas").doc(listaAtiva).collection("lista").get();
  const aComprar = new Set(
    snapLista.docs.filter((d) => !d.data().comprado).map((d) => d.data().produtoId).filter(Boolean),
  );

  const compradosDaLista = [];
  const extras = [];
  const daLista = new Set();
  for (const linha of linhas) {
    const valor = centavos(valorDaLinha(linha));
    const registro = { produtoId: linha.produtoId || null, nome: linha.nome, valor };
    if (linha.produtoId && aComprar.has(linha.produtoId) && !daLista.has(linha.produtoId)) {
      daLista.add(linha.produtoId);
      compradosDaLista.push(registro);
    } else {
      extras.push(registro);
    }
  }

  const idsEsquecidos = [...aComprar].filter((id) => !daLista.has(id));
  const docsEsquecidos = idsEsquecidos.length
    ? await db.getAll(...idsEsquecidos.map((id) => db.collection("catalogo").doc(id)))
    : [];
  const esquecidos = docsEsquecidos.map((d) => ({ produtoId: d.id, nome: d.data()?.nome || null }));

  const soma = (lista) => centavos(lista.reduce((t, l) => t + l.valor, 0));
  const resumo = {
    loteId,
    uid,
    listaAtiva,
    mercado,
    data,
    planejados: aComprar.size,
    compradosDaLista,
    extras,
    esquecidos,
    valorTotal: soma([...compradosDaLista, ...extras]),
    valorExtras: soma(extras),
    registradoEm: FieldValue.serverTimestamp(),
  };
  await db.collection("idasMercado").doc(loteId).set(resumo);
  return resumo;
}
