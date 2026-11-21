import { getFirestore } from "firebase-admin/firestore";

// Produto que veio numa nota recente foi comprado agora: vai para "tem em
// casa" na lista ativa da casa (item com comprado: true, igual à casinha do
// catálogo no app). Nota antiga (registrada só pelo preço) não mexe na casa,
// porque o produto pode já ter acabado.
export const DIAS_NOTA_RECENTE = 7;

const DIA_MS = 24 * 60 * 60 * 1000;

export function notaRecente(dataIso, hoje = new Date()) {
  if (!dataIso) return true; // sem data, registrarPreco usa "hoje"
  const data = new Date(`${dataIso}T12:00:00`);
  if (Number.isNaN(data.getTime())) return false;
  return hoje.getTime() - data.getTime() <= DIAS_NOTA_RECENTE * DIA_MS;
}

function refLista(listaAtiva) {
  return getFirestore().collection("listas").doc(listaAtiva).collection("lista");
}

/**
 * Marca os produtos como em casa na lista. Item que já existe a comprar passa
 * para comprado; produto fora da lista é criado já comprado; o que já está em
 * casa fica como está.
 * @returns {Promise<Map<string, {efeito: "criado"|"marcado", itemId: string}>>}
 *   só os produtos que mudaram (para quem precisar desfazer).
 */
export async function marcarEmCasa(listaAtiva, produtoIds) {
  const efeitos = new Map();
  const ids = [...new Set(produtoIds.filter(Boolean))];
  if (!listaAtiva || !ids.length) return efeitos;

  const ref = refLista(listaAtiva);
  const snap = await ref.get();
  const itemPorProduto = new Map(snap.docs.map((d) => [d.data().produtoId, d]));

  const batch = getFirestore().batch();
  for (const produtoId of ids) {
    const existente = itemPorProduto.get(produtoId);
    if (!existente) {
      const novo = ref.doc();
      batch.set(novo, { produtoId, comprado: true });
      efeitos.set(produtoId, { efeito: "criado", itemId: novo.id });
    } else if (!existente.data().comprado) {
      batch.update(existente.ref, { comprado: true });
      efeitos.set(produtoId, { efeito: "marcado", itemId: existente.id });
    }
  }
  if (efeitos.size) await batch.commit();
  return efeitos;
}

// Desfaz o que marcarEmCasa fez num produto: apaga o item criado, ou devolve
// o item marcado para "a comprar".
export async function desfazerEmCasa(listaAtiva, { efeito, itemId } = {}) {
  if (!listaAtiva || !itemId) return;
  const doc = refLista(listaAtiva).doc(itemId);
  if (efeito === "criado") await doc.delete();
  else if (efeito === "marcado") await doc.update({ comprado: false });
}
