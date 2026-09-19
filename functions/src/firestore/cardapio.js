import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { obterListaAtivaDoUsuario } from "./historico.js";

export async function buscarPerfilCasa(uid) {
  const db = getFirestore();
  const doc = await db.collection("perfilCasa").doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function salvarPerfilCasa(uid, { pessoas, observacoesGerais, horarioEnvio, refeicoes, chatId }) {
  const db = getFirestore();
  const ref = db.collection("perfilCasa").doc(uid);
  const existe = (await ref.get()).exists;

  await ref.set(
    {
      pessoas,
      observacoesGerais,
      horarioEnvio,
      refeicoes,
      chatId: String(chatId),
      ...(existe ? {} : { criadoEm: FieldValue.serverTimestamp() }),
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

// menuState só existe enquanto há navegação do menu /casa em curso. Dot-path
// só vira "grava dentro do mapa aninhado" com .update() — com .set(patch,
// {merge:true}) as chaves com ponto são gravadas como nome de campo literal
// (ex: um campo chamado "menuState.tela", e não menuState.tela dentro de um
// mapa menuState), o que deixava perfil.menuState sempre undefined e o
// webhook nunca via aguardandoTexto (bug real: qualquer edição no /casa
// "sumia" e caía no fallback de /help).
export async function atualizarMenuState(uid, { tela, messageId, aguardandoTexto, refeicoesRascunho }) {
  const db = getFirestore();
  const ref = db.collection("perfilCasa").doc(uid);
  const doc = await ref.get();
  const patch = {};
  if (tela !== undefined) patch["menuState.tela"] = tela;
  if (messageId !== undefined) patch["menuState.messageId"] = messageId;
  if (aguardandoTexto !== undefined) patch["menuState.aguardandoTexto"] = aguardandoTexto;
  if (refeicoesRascunho !== undefined) patch["menuState.refeicoesRascunho"] = refeicoesRascunho;
  if (doc.exists) {
    await ref.update(patch);
  } else {
    await ref.set(patch);
  }
}

export async function limparAguardandoTexto(uid) {
  const db = getFirestore();
  await db.collection("perfilCasa").doc(uid).set({ menuState: { aguardandoTexto: null } }, { merge: true });
}

// Mesmo padrão de atualizarItemDoLote (lotes.js): lê, mapeia por índice,
// grava de volta numa transação. indice === pessoas.length empurra no fim
// (inclusão); qualquer outro índice substitui a pessoa existente (edição).
export async function atualizarPessoa(uid, indice, dadosPessoa) {
  const db = getFirestore();
  const ref = db.collection("perfilCasa").doc(uid);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const pessoas = doc.data()?.pessoas || [];
    const novasPessoas =
      indice < pessoas.length
        ? pessoas.map((p, i) => (i === indice ? dadosPessoa : p))
        : [...pessoas, dadosPessoa];
    tx.set(ref, { pessoas: novasPessoas, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export async function removerPessoa(uid, indice) {
  const db = getFirestore();
  const ref = db.collection("perfilCasa").doc(uid);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const pessoas = (doc.data()?.pessoas || []).filter((_, i) => i !== indice);
    tx.set(ref, { pessoas, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export async function buscarPerfisParaHorario(horarioAtual) {
  const db = getFirestore();
  const snap = await db.collection("perfilCasa").where("horarioEnvio", "==", horarioAtual).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Categorias do catálogo (ver src/utils/categorias.js no frontend) que não
// são alimento — excluídas do contexto do cardápio para o Gemini não tentar
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

  const [itensSnap, catalogoSnap] = await Promise.all([
    db.collection("listas").doc(listaAtiva).collection("lista").where("comprado", "==", true).get(),
    db.collection("catalogo").get(),
  ]);

  if (itensSnap.empty) return [];

  const catalogoPorId = new Map(catalogoSnap.docs.map((d) => [d.id, d.data()]));

  return itensSnap.docs
    .map((doc) => {
      const produto = catalogoPorId.get(doc.data().produtoId);
      if (!produto || CATEGORIAS_NAO_ALIMENTARES.has(produto.categoria)) return null;
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

// Usado só pelo comando explícito /feedback_cardapio — sem o filtro
// aguardandoFeedback, já que o usuário está pedindo feedback por vontade
// própria, não porque o bot ficou "escutando" qualquer texto livre (isso
// causava um bug real: um cardápio nunca respondido sequestrava qualquer
// mensagem de texto futura, de qualquer fluxo, indefinidamente).
export async function buscarCardapioMaisRecente(chatId) {
  const db = getFirestore();
  const snap = await db
    .collection("cardapiosDiarios")
    .where("chatId", "==", String(chatId))
    .orderBy("criadoEm", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
