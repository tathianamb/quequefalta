import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function buscarProximoComStatus(uid, status) {
  const db = getFirestore();
  const snap = await db
    .collection("filaRevisaoNotas")
    .where("uid", "==", uid)
    .where("status", "==", status)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function contarComStatus(uid, status) {
  const db = getFirestore();
  const snap = await db
    .collection("filaRevisaoNotas")
    .where("uid", "==", uid)
    .where("status", "==", status)
    .count()
    .get();
  return snap.data().count;
}

export async function buscarItemRevisaoPorId(itemId) {
  const db = getFirestore();
  const doc = await db.collection("filaRevisaoNotas").doc(itemId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function resolverItemRevisao(itemId, produtoId) {
  const db = getFirestore();
  await db.collection("filaRevisaoNotas").doc(itemId).update({
    status: "resolvido",
    produtoIdResolvido: produtoId,
    resolvidoEm: FieldValue.serverTimestamp(),
  });
}

export async function ignorarItemRevisao(itemId) {
  const db = getFirestore();
  await db.collection("filaRevisaoNotas").doc(itemId).update({
    status: "ignorado",
    resolvidoEm: FieldValue.serverTimestamp(),
  });
}

export async function marcarItemComoSugerido(itemId) {
  const db = getFirestore();
  await db.collection("filaRevisaoNotas").doc(itemId).update({
    status: "sugerido",
    resolvidoEm: FieldValue.serverTimestamp(),
  });
}

export async function atualizarNomeItemRevisao(itemId, novoNome) {
  const db = getFirestore();
  await db.collection("filaRevisaoNotas").doc(itemId).update({
    nomeExtraido: novoNome,
    aguardandoNomeNovo: false,
  });
}

export async function marcarAguardandoNomeNovo(itemId) {
  const db = getFirestore();
  await db.collection("filaRevisaoNotas").doc(itemId).update({ aguardandoNomeNovo: true });
}

export async function buscarItemAguardandoNome(uid) {
  const db = getFirestore();
  const snap = await db
    .collection("filaRevisaoNotas")
    .where("uid", "==", uid)
    .where("aguardandoNomeNovo", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function adicionarNaFilaDeRevisao({
  loteId,
  uid,
  chatId,
  nomeExtraido,
  precoExtraido,
  unidade,
  mercado,
  dataDaNota,
  status = "pendente",
}) {
  const db = getFirestore();
  await db.collection("filaRevisaoNotas").add({
    loteId,
    uid,
    chatId: String(chatId),
    nomeExtraido,
    precoExtraido,
    unidade,
    mercado,
    dataDaNota: dataDaNota || null,
    status,
    criadoEm: FieldValue.serverTimestamp(),
    resolvidoEm: status === "ignorado" ? FieldValue.serverTimestamp() : null,
    produtoIdResolvido: null,
  });
}