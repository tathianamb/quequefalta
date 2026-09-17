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

export async function marcarAguardandoNomeNovo(itemId, messageId) {
  const db = getFirestore();
  await db.collection("filaRevisaoNotas").doc(itemId).update({
    aguardandoNomeNovo: true,
    messageIdAguardandoNome: messageId,
  });
}

// Guarda o produto candidato e a mensagem original enquanto o usuário decide
// se aceita a duplicata detectada — evita ter que embutir esses dados no
// callback_data do botão "Aceitar" (loteId/itemId já quase estouram os 64
// bytes do Telegram sozinhos).
export async function marcarAguardandoConfirmacaoDuplicata(itemId, produtoIdCandidato, messageIdOriginal) {
  const db = getFirestore();
  await db.collection("filaRevisaoNotas").doc(itemId).update({
    duplicataCandidata: { produtoIdCandidato, messageIdOriginal },
  });
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