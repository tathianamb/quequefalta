import { getFirestore } from "firebase-admin/firestore";

// Catálogo usado para casar os nomes da nota com produtos. Produtos genéricos
// (generico: true, ex: "Óleo") ficam de fora: existem só como ingrediente de
// receita, e o preço é sempre de uma variante comprada ("Óleo de girassol").
export async function carregarCatalogoParaMatch() {
  const snap = await getFirestore().collection("catalogo").get();
  return snap.docs
    .filter((d) => !d.data().generico)
    .map((d) => ({ id: d.id, nome: d.data().nome }));
}
