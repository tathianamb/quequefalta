import { getFirestore } from "firebase-admin/firestore";
import { obterListaAtivaDoUsuario } from "./historico.js";

// Categorias do catálogo (ver src/utils/categorias.js no frontend) que não
// são alimento — excluídas do contexto do chat para o Gemini não tentar
// "aproveitar" shampoo ou detergente numa receita.
const CATEGORIAS_NAO_ALIMENTARES = new Set([
  "Limpeza",
  "Utensílios de Cozinha",
  "Higiene Pessoal",
  "Farmácia Básica",
  "Pet Shop",
]);

// Junta os itens marcados como comprado=true na lista ativa do usuário com
// nome/categoria do catálogo — o item da lista só guarda produtoId, os
// demais dados vivem só em catalogo/{produtoId} (mesmo padrão de join em
// memória usado em revisar.js para fuzzy match). Itens de categorias
// não-alimentares (limpeza, higiene, etc.) são excluídos do resultado.
export async function obterItensComprados(uid) {
  const db = getFirestore();
  const listaAtiva = await obterListaAtivaDoUsuario(uid);
  if (!listaAtiva) return [];

  const itensSnap = await db.collection("listas").doc(listaAtiva).collection("lista").where("comprado", "==", true).get();

  if (itensSnap.empty) return [];

  // Lê só os produtos que estão na lista (e não o catálogo inteiro, ~500
  // docs): cada mensagem do chat chega aqui, e a leitura completa gastava a
  // cota diária de leituras do Firestore muito rápido.
  const idsProdutos = [...new Set(itensSnap.docs.map((d) => d.data().produtoId).filter(Boolean))];
  if (!idsProdutos.length) return [];
  const produtosSnap = await db.getAll(...idsProdutos.map((id) => db.collection("catalogo").doc(id)));
  const catalogoPorId = new Map(produtosSnap.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  return itensSnap.docs
    .map((doc) => {
      const produto = catalogoPorId.get(doc.data().produtoId);
      if (!produto || CATEGORIAS_NAO_ALIMENTARES.has(produto.categoria)) return null;
      return { nome: produto.nome, categoria: produto.categoria };
    })
    .filter(Boolean);
}
