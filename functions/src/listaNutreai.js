// pedirNaLista: o nutreai (repositório privado tathianamb/nutreai) põe itens
// "para comprar" na lista da casa. É a única porta de escrita de fora do app
// na lista, e só sabe fazer isso: criar { produtoId, comprado: false } ou
// passar comprado de true para false. Nunca apaga e não mexe em outra coleção.
//
//   POST, Authorization: Bearer <NUTREAI_LISTA_SEGREDO>
//   { "itens": [ { "produtoId": "abc", "nome": "Pão" } ] }   (1 a 20 itens)
//   → 200 { "resultados": [ { produtoId, aplicadoEm, nome, status } ] }, na mesma ordem
//   status: comprar | ja_na_lista | nao_existe | generico_sem_variante | invalido | erro
//   aplicadoEm: o produtoId gravado (outro quando o pedido era um genérico), ou null.
//
// A casa é a lista ativa de NUTREAI_CASA_UID (nutreai/autenticacao.js).
// Regras da decisão em lista/decidir.js.
import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { NUTREAI_LISTA_SEGREDO, NUTREAI_CASA_UID, autorizar, casaUid } from "./nutreai/autenticacao.js";
import { decidirPedido, lerCorpo, ID_VALIDO } from "./lista/decidir.js";

async function aplicarPedidos(pedidos, uid) {
  const db = getFirestore();
  const listaAtiva = (await db.collection("usuarios").doc(uid).get()).data()?.listaAtiva;
  if (!listaAtiva) throw new Error("Casa sem lista ativa");
  const refLista = db.collection("listas").doc(listaAtiva).collection("lista");
  const itens = (await refLista.get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  let catalogo = null; // só carrega se algum pedido for de produto genérico

  const resultados = [];
  for (const { produtoId, nome } of pedidos) {
    const base = { produtoId, aplicadoEm: null, nome };
    if (!ID_VALIDO.test(produtoId)) {
      resultados.push({ ...base, status: "invalido" });
      continue;
    }
    try {
      const doc = await db.collection("catalogo").doc(produtoId).get();
      const produto = doc.exists ? { id: doc.id, ...doc.data() } : null;
      if (produto?.generico && !catalogo) {
        catalogo = (await db.collection("catalogo").get()).docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      const decisao = decidirPedido(produto, catalogo || [], itens, listaAtiva);
      const aplicado = decisao.produto ? { aplicadoEm: decisao.produto.id, nome: decisao.produto.nome } : {};
      if (decisao.acao === "criar") {
        const novo = await refLista.add({ produtoId: decisao.produto.id, comprado: false });
        itens.push({ id: novo.id, produtoId: decisao.produto.id, comprado: false });
      } else if (decisao.acao === "desmarcar") {
        await refLista.doc(decisao.itemId).update({ comprado: false });
        itens.find((i) => i.id === decisao.itemId).comprado = false;
      }
      resultados.push({ ...base, ...aplicado, status: decisao.status });
    } catch (e) {
      console.error("pedirNaLista: falha no item", produtoId, e);
      resultados.push({ ...base, status: "erro" });
    }
  }
  return resultados;
}

export const pedirNaLista = onRequest(
  {
    region: "southamerica-east1",
    secrets: [NUTREAI_LISTA_SEGREDO, NUTREAI_CASA_UID],
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 1,
  },
  async (req, res) => {
    if (!autorizar(req, res)) return;
    const pedidos = lerCorpo(req.body);
    if (!pedidos) {
      res.status(400).json({ erro: 'corpo esperado: { "itens": [ { "produtoId": "..." } ] }, de 1 a 20 itens' });
      return;
    }
    try {
      res.status(200).json({ resultados: await aplicarPedidos(pedidos, casaUid()) });
    } catch (e) {
      console.error("pedirNaLista:", e);
      res.status(500).json({ erro: "falha ao ler a lista da casa" });
    }
  },
);
