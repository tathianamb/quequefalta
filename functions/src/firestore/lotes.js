import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function buscarLoteEmAberto(chatId) {
  const db = getFirestore();
  const snap = await db
    .collection("lotesNotaFiscal")
    .where("chatId", "==", String(chatId))
    .where("status", "==", "aguardando_confirmacao")
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function criarLote({
  chatId,
  uid,
  dataDaNota,
  mercado,
  status,
  itens,
  totalNota = null,
  somaItens = null,
  linhasIgnoradas = [],
  formato = null,
}) {
  const db = getFirestore();
  const ref = await db.collection("lotesNotaFiscal").add({
    chatId: String(chatId),
    uid,
    status,
    dataDaNota: dataDaNota || null,
    mercado,
    totalNota,
    somaItens,
    linhasIgnoradas,
    formato,
    etapaAtual: 1,
    itens: itens.map((item, indice) => ({
      indice,
      nomeExtraido: item.nome,
      // nomeExtraido muda com "✏️ Corrigir nome"; nomeOriginal fica como veio
      // na nota — é a chave da memória de apelidos (firestore/apelidos.js).
      nomeOriginal: item.nome,
      precoExtraido: item.preco,
      unidade: item.unidade,
      quantidade: item.quantidade ?? null,
      desconto: item.desconto ?? null,
      total: item.total ?? null,
      precoPago: item.precoPago ?? null,
      // Marca e tamanho da embalagem (parser/marcaTamanho.js); a resposta ao
      // "🏷️ Marca e tamanho" da etapa 4 corrige (aplicarMarcasNoLote).
      marca: item.marca ?? null,
      semMarca: Boolean(item.semMarca),
      tamanho: item.tamanho ?? null,
      medida: item.medida ?? null,
      produtoIdCasado: item.match.melhorMatch?.id || null,
      nomeProdutoCasado: item.match.melhorMatch?.nome || null,
      sugestoes: item.match.sugestoes,
      statusMatch: item.match.melhorMatch ? "match" : "sem_match",
      origemMatch: item.match.melhorMatch?.origem || (item.match.melhorMatch ? "fuzzy" : null),
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

// Pergunta "🏷️ Marca e tamanho" aberta ({ messageIdOriginal, messageIdPergunta })
// ou fechada (null). A resposta em texto livre (telegramWebhook.js) apaga a
// pergunta e a resposta e edita a tela original. Ao abrir, nenhum item fica
// esperando nome corrigido: a próxima mensagem de texto é a resposta daqui.
export async function definirPerguntaMarcas(loteId, pergunta) {
  const db = getFirestore();
  const ref = db.collection("lotesNotaFiscal").doc(loteId);
  await db.runTransaction(async (tx) => {
    const lote = (await tx.get(ref)).data();
    const itens = pergunta
      ? lote.itens.map((i) => (i.revisao?.aguardandoNomeNovo ? { ...i, revisao: null } : i))
      : lote.itens;
    tx.update(ref, { itens, aguardandoMarcas: pergunta, atualizadoEm: FieldValue.serverTimestamp() });
  });
}

// Aplica a resposta lida por lerRespostaMarcas e fecha a pergunta.
export async function aplicarMarcasNoLote(loteId, mudancas) {
  const db = getFirestore();
  const ref = db.collection("lotesNotaFiscal").doc(loteId);
  await db.runTransaction(async (tx) => {
    const lote = (await tx.get(ref)).data();
    const porIndice = new Map(mudancas.map(({ indice, ...campos }) => [indice, campos]));
    const itens = lote.itens.map((i) => (porIndice.has(i.indice) ? { ...i, ...porIndice.get(i.indice) } : i));
    tx.update(ref, { itens, aguardandoMarcas: null, atualizadoEm: FieldValue.serverTimestamp() });
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