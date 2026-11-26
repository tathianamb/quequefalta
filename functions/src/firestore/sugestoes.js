import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { normalizar } from "../matching/fuzzyMatch.js";
import { aprenderApelido } from "./apelidos.js";

// Retorna true se já existir uma sugestão pendente com o mesmo nome
// (comparado normalizado, ignorando acentos/maiúsculas) — evita duplicar o
// mesmo produto na fila de aprovação quando sugerido mais de uma vez.
async function jaExisteSugestaoPendente(nome) {
  const db = getFirestore();
  const alvo = normalizar(nome);
  const snap = await db.collection("sugestoes").where("status", "==", "pendente").get();
  return snap.docs.some((d) => normalizar(d.data().nome) === alvo);
}

// `nomeNota` (texto original da nota), quantidade, unidade, precoPago, marca,
// tamanho e medida acompanham o preço: ao aprovar, o app grava o primeiro
// registro do produto com eles (useSugestoes.aprovar), e o bot aprende o
// apelido do texto (aprenderSugestoesAprovadas).
export async function criarSugestaoDeProduto({
  nome, uid, listaAtiva, preco, mercado, data,
  nomeNota = nome, quantidade = null, unidade = null, precoPago = null, marca = null, tamanho = null, medida = null,
}) {
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
    nomeNota: nomeNota ?? null,
    quantidadeSugerida: quantidade ?? null,
    unidadeSugerida: unidade ?? null,
    precoPagoSugerido: precoPago ?? null,
    marcaSugerida: marca ?? null,
    tamanhoSugerido: tamanho ?? null,
    medidaSugerida: medida ?? null,
    criadoEm: FieldValue.serverTimestamp(),
    status: "pendente",
  });
  return { jaExistia: false };
}

// Sugestão aprovada no app vira produto novo, mas o app não escreve em
// apelidosNota (coleção só do bot). Ao aprovar, o app marca
// `apelidoPendente: true` com o `produtoId` criado; aqui, antes de casar a
// próxima nota, o bot aprende "texto da nota → produto". Sem isso, a mesma
// nota não casava de novo e virava outra sugestão (produto duplicado).
export async function aprenderSugestoesAprovadas() {
  const db = getFirestore();
  const snap = await db.collection("sugestoes").where("apelidoPendente", "==", true).get();
  for (const doc of snap.docs) {
    const s = doc.data();
    if (s.nomeNota && s.produtoId) {
      await aprenderApelido(s.nomeNota, s.produtoId, {
        marca: s.marcaSugerida, tamanho: s.tamanhoSugerido, medida: s.medidaSugerida, unidade: s.unidadeSugerida,
      });
    }
    await doc.ref.update({ apelidoPendente: false });
  }
}
