import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function buscarLoteEmAberto(chatId) {
  const db = getFirestore();
  const snap = await db
    .collection("lotesNotaFiscal")
    .where("chatId", "==", String(chatId))
    .where("status", "in", ["aguardando_mercado", "aguardando_confirmacao"])
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function criarLote({
  chatId,
  uid,
  fotoFileId = null,
  dataDaNota,
  mercado = null,
  status = "aguardando_mercado",
  itens,
}) {
  const db = getFirestore();
  const ref = await db.collection("lotesNotaFiscal").add({
    chatId: String(chatId),
    uid,
    status,
    fotoFileId,
    dataDaNota: dataDaNota || null,
    mercado,
    etapaAtual: 1,
    itens: itens.map((item, indice) => ({
      indice,
      nomeExtraido: item.nome,
      nomeExpandido: item.nomeExpandido || null,
      precoExtraido: item.preco,
      unidade: item.unidade,
      produtoIdCasado: item.match.melhorMatch?.id || null,
      nomeProdutoCasado: item.match.melhorMatch?.nome || null,
      sugestoes: item.match.sugestoes,
      statusMatch: item.match.melhorMatch ? "match" : "sem_match",
      confirmado: true,
      revisao: null,
      jaRegistrado: item.jaRegistrado || false,
    })),
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function definirEtapaDoLote(loteId, etapa) {
  const db = getFirestore();
  await db.collection("lotesNotaFiscal").doc(loteId).update({
    etapaAtual: etapa,
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}

export async function definirMercado(loteId, mercado) {
  const db = getFirestore();
  await db.collection("lotesNotaFiscal").doc(loteId).update({
    mercado,
    status: "aguardando_confirmacao",
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}

export async function atualizarItemDoLote(loteId, indice, dadosItem) {
  const db = getFirestore();
  const ref = db.collection("lotesNotaFiscal").doc(loteId);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const lote = doc.data();
    const itens = lote.itens.map((item) =>
      item.indice === indice ? { ...item, ...dadosItem } : item
    );
    tx.update(ref, { itens, atualizadoEm: FieldValue.serverTimestamp() });
  });
}

export async function marcarLoteConfirmado(loteId) {
  const db = getFirestore();
  await db.collection("lotesNotaFiscal").doc(loteId).update({
    status: "confirmado",
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}

export async function marcarLoteCancelado(loteId) {
  const db = getFirestore();
  await db.collection("lotesNotaFiscal").doc(loteId).update({
    status: "cancelado",
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}

export async function buscarLotePorId(loteId) {
  const db = getFirestore();
  const doc = await db.collection("lotesNotaFiscal").doc(loteId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}