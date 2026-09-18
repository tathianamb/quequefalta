import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { obterListaAtivaDoUsuario } from "./historico.js";

export async function buscarPerfilCasa(uid) {
  const db = getFirestore();
  const doc = await db.collection("perfilCasa").doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function salvarPerfilCasa(uid, { pessoas, observacoesGerais, horarioEnvio, chatId }) {
  const db = getFirestore();
  const ref = db.collection("perfilCasa").doc(uid);
  const existe = (await ref.get()).exists;

  await ref.set(
    {
      pessoas,
      observacoesGerais,
      horarioEnvio,
      chatId: String(chatId),
      ...(existe ? {} : { criadoEm: FieldValue.serverTimestamp() }),
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function buscarPerfisParaHorario(horarioAtual) {
  const db = getFirestore();
  const snap = await db.collection("perfilCasa").where("horarioEnvio", "==", horarioAtual).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Junta os itens marcados como comprado=true na lista ativa do usuário com
// nome/categoria do catálogo — o item da lista só guarda produtoId, os
// demais dados vivem só em catalogo/{produtoId} (mesmo padrão de join em
// memória usado em revisar.js para fuzzy match).
export async function obterItensComprados(uid) {
  const db = getFirestore();
  const listaAtiva = await obterListaAtivaDoUsuario(uid);
  if (!listaAtiva) return [];

  const [itensSnap, catalogoSnap] = await Promise.all([
    db.collection("listas").doc(listaAtiva).collection("lista").where("comprado", "==", true).get(),
    db.collection("catalogo").get(),
  ]);

  if (itensSnap.empty) return [];

  const catalogoPorId = new Map(catalogoSnap.docs.map((d) => [d.id, d.data()]));

  return itensSnap.docs
    .map((doc) => {
      const produto = catalogoPorId.get(doc.data().produtoId);
      if (!produto) return null;
      return { nome: produto.nome, categoria: produto.categoria };
    })
    .filter(Boolean);
}

export async function buscarCardapioDoDia(uid, dataIso) {
  const db = getFirestore();
  const doc = await db.collection("cardapiosDiarios").doc(`${uid}_${dataIso}`).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function criarCardapioDoDia(uid, dataIso, { chatId, promptContexto, prompt, resposta }) {
  const db = getFirestore();
  const id = `${uid}_${dataIso}`;
  await db
    .collection("cardapiosDiarios")
    .doc(id)
    .set({
      uid,
      chatId: String(chatId),
      data: dataIso,
      status: "aguardando_feedback",
      promptContexto,
      respostaAtual: resposta,
      // FieldValue.serverTimestamp() não pode ser usado dentro de um array —
      // Firestore rejeita o write inteiro. Usamos Date() do processo, que é
      // suficiente para ordenar o histórico dentro de uma mesma conversa.
      historico: [{ tipo: "geracao_inicial", prompt, resposta, em: new Date() }],
      aguardandoFeedback: true,
      messageId: null,
      erro: null,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  return id;
}

export async function marcarErroCardapio(cardapioId, mensagemErro) {
  const db = getFirestore();
  await db.collection("cardapiosDiarios").doc(cardapioId).update({
    status: "erro",
    erro: mensagemErro,
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}

export async function registrarFeedbackCardapio(cardapioId, { feedbackUsuario, prompt, resposta }) {
  const db = getFirestore();
  await db
    .collection("cardapiosDiarios")
    .doc(cardapioId)
    .update({
      status: "aguardando_feedback",
      respostaAtual: resposta,
      historico: FieldValue.arrayUnion({
        tipo: "feedback",
        feedbackUsuario,
        prompt,
        resposta,
        em: new Date(),
      }),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
}

export async function marcarMessageId(cardapioId, messageId) {
  const db = getFirestore();
  await db.collection("cardapiosDiarios").doc(cardapioId).update({
    messageId,
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}

export async function buscarCardapioAguardandoFeedback(chatId) {
  const db = getFirestore();
  const snap = await db
    .collection("cardapiosDiarios")
    .where("chatId", "==", String(chatId))
    .where("aguardandoFeedback", "==", true)
    .orderBy("criadoEm", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
