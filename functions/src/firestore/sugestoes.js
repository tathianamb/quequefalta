import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { normalizar } from "../matching/fuzzyMatch.js";

// Retorna true se já existir uma sugestão pendente com o mesmo nome
// (comparado normalizado, ignorando acentos/maiúsculas) — evita duplicar o
// mesmo produto na fila de aprovação quando sugerido mais de uma vez.
async function jaExisteSugestaoPendente(nome) {
  const db = getFirestore();
  const alvo = normalizar(nome);
  const snap = await db.collection("sugestoes").where("status", "==", "pendente").get();
  return snap.docs.some((d) => normalizar(d.data().nome) === alvo);
}

export async function criarSugestaoDeProduto({ nome, uid, listaAtiva, preco, mercado, data }) {
  if (await jaExisteSugestaoPendente(nome)) {
    return { jaExistia: true };
  }

  const db = getFirestore();
  const usuarioDoc = await db.collection("usuarios").doc(uid).get();
  const email = usuarioDoc.data()?.email || null;

  await db.collection("sugestoes").add({
    nome,
    categoria: "Outro",
    subcategoria: "",
    sugeridoPor: email,
    listaAtiva,
    // Preço da nota que originou a sugestão — usado para já criar o produto
    // com o primeiro registro de histórico quando a sugestão for aprovada
    // (sem isso, o preço que motivou a sugestão seria perdido para sempre).
    precoSugerido: preco ?? null,
    mercadoSugerido: mercado ?? null,
    dataSugerida: data ?? null,
    criadoEm: FieldValue.serverTimestamp(),
    status: "pendente",
  });
  return { jaExistia: false };
}
