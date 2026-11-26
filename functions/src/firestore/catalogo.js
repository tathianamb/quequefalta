import { getFirestore } from "firebase-admin/firestore";

// Catálogo usado para casar os nomes da nota com produtos. Produtos genéricos
// (generico: true, ex: "Óleo") ficam de fora: existem só como ingrediente de
// receita, e o preço é sempre de uma variante comprada ("Óleo de girassol").
// `marcas` são todas as marcas já vistas (preços e marca preferida), usadas
// para reconhecer a marca no nome da nota (parser/marcaTamanho.js).
export async function carregarCatalogoEMarcas() {
  const snap = await getFirestore().collection("catalogo").get();
  const marcas = new Set();
  for (const d of snap.docs) {
    const p = d.data();
    if (p.marcaPreferida) marcas.add(p.marcaPreferida);
    for (const h of p.historico || []) if (h.marca) marcas.add(h.marca);
  }
  const catalogo = snap.docs
    .filter((d) => !d.data().generico)
    .map((d) => ({ id: d.id, nome: d.data().nome }));
  return { catalogo, marcas: [...marcas] };
}

export async function carregarCatalogoParaMatch() {
  return (await carregarCatalogoEMarcas()).catalogo;
}
