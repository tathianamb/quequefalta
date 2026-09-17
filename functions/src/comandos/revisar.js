import { getFirestore } from "firebase-admin/firestore";
import { buscarProximoComStatus, contarComStatus } from "../firestore/revisao.js";
import { encontrarMatch } from "../matching/fuzzyMatch.js";
import { tecladoRevisaoItem, tecladoEtapa3 } from "../telegram/teclados.js";
import { enviarOuEditar } from "../telegram/enviarOuEditar.js";

// Fonte "fila global" — usada por /revisar e /adiados, opera sobre a coleção
// filaRevisaoNotas filtrada por uid+status. Cada item precisa de um `ref`
// (usado no callback_data com escopo "fila:{itemId}") e um `id` (o próprio
// itemId, usado pelas queries de buscarProximo/contar).
function fonteFila(uid, status) {
  return {
    async buscarProximo() {
      const item = await buscarProximoComStatus(uid, status);
      return item ? { ...item, ref: `fila:${item.id}` } : null;
    },
    contar: () => contarComStatus(uid, status),
  };
}

async function mostrarProximoComFonte(telegram, chatId, fonte, { rotulo, mensagemVazia }, messageId) {
  const item = await fonte.buscarProximo();
  if (!item) {
    await enviarOuEditar(telegram, chatId, messageId, mensagemVazia);
    return;
  }

  const restantes = await fonte.contar();

  const db = getFirestore();
  const catalogoSnap = await db.collection("catalogo").get();
  const catalogo = catalogoSnap.docs.map((d) => ({ id: d.id, nome: d.data().nome }));
  const { sugestoes } = encontrarMatch({ nome: item.nomeExtraido }, catalogo);

  const preco = `R$ ${item.precoExtraido.toFixed(2).replace(".", ",")}`;
  const textoSugestoes = sugestoes.length
    ? "Escolha o produto certo, ou:"
    : "Não achei sugestões parecidas. Você pode:";

  await enviarOuEditar(
    telegram,
    chatId,
    messageId,
    `${rotulo} (${restantes} ite${restantes > 1 ? "ns" : "m"})\n\n"${item.nomeExtraido}" — ${preco} (${item.mercado})\n\n${textoSugestoes}`,
    { reply_markup: tecladoRevisaoItem(item.ref, sugestoes) }
  );
}

export async function mostrarProximaRevisao(telegram, chatId, uid, messageId) {
  await mostrarProximoComFonte(
    telegram,
    chatId,
    fonteFila(uid, "pendente"),
    { rotulo: "📋 Revisão", mensagemVazia: "Nenhum item pendente de revisão. 🎉" },
    messageId
  );
}

export async function mostrarProximoAdiado(telegram, chatId, uid, messageId) {
  await mostrarProximoComFonte(
    telegram,
    chatId,
    fonteFila(uid, "ignorado"),
    { rotulo: "⏭️ Adiados", mensagemVazia: "Nenhum item deixado para depois. 🎉" },
    messageId
  );
}

// Um item da fila de revisão pode vir da lista de pendentes normais ou da
// lista de "adiados" (mande /adiados) — depois de resolver/sugerir/corrigir
// um item, mostramos o próximo item da MESMA lista de onde ele veio.
export function mostrarProximoDaMesmaLista(telegram, chatId, item, messageId) {
  return item.status === "ignorado"
    ? mostrarProximoAdiado(telegram, chatId, item.uid, messageId)
    : mostrarProximaRevisao(telegram, chatId, item.uid, messageId);
}

// Fonte "lote" — usada pela etapa 3 da navegação do lote. Opera direto sobre
// o array itens[] do próprio documento do lote (nunca toca filaRevisaoNotas
// antes da etapa 4), mantendo o lote como única fonte de verdade durante a
// navegação. Um item "pendente" aqui é sem-match e ainda não revisado.
function itensSemMatchPendentes(lote) {
  return lote.itens.filter((i) => i.statusMatch === "sem_match" && !i.revisao);
}

export async function mostrarEtapa3(telegram, chatId, lote, messageId) {
  const pendentes = itensSemMatchPendentes(lote);
  if (!pendentes.length) {
    await enviarOuEditar(
      telegram,
      chatId,
      messageId,
      "Etapa 3/4 — Revisão dos itens sem match\n\nNenhum item sem match aqui.",
      { reply_markup: tecladoEtapa3(lote.id, null) }
    );
    return;
  }

  const item = pendentes[0];
  const db = getFirestore();
  const catalogoSnap = await db.collection("catalogo").get();
  const catalogo = catalogoSnap.docs.map((d) => ({ id: d.id, nome: d.data().nome }));
  const { sugestoes } = encontrarMatch({ nome: item.nomeExtraido }, catalogo);

  const preco = `R$ ${item.precoExtraido.toFixed(2).replace(".", ",")}`;
  const textoSugestoes = sugestoes.length
    ? "Escolha o produto certo, ou:"
    : "Não achei sugestões parecidas. Você pode:";

  await enviarOuEditar(
    telegram,
    chatId,
    messageId,
    `Etapa 3/4 — Revisão dos itens sem match (${pendentes.length} ite${pendentes.length > 1 ? "ns" : "m"})\n\n"${item.nomeExtraido}" — ${preco} (${lote.mercado})\n\n${textoSugestoes}`,
    { reply_markup: tecladoEtapa3(lote.id, item, sugestoes) }
  );
}
