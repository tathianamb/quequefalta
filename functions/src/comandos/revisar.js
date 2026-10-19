import { getFirestore } from "firebase-admin/firestore";
import { buscarProximoComStatus, contarComStatus, buscarItemRevisaoPorId } from "../firestore/revisao.js";
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

// `linhasExtras` são linhas de botões anexadas ao fim do teclado — usado para
// o "↩️ Desfazer" do item que acabou de ser resolvido, que precisa aparecer
// tanto sobre o próximo item quanto sobre a mensagem de "fila vazia".
async function renderizarItemDaFila(telegram, chatId, item, rotulo, restantes, messageId, prefixo = "", linhasExtras = []) {
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
    `${prefixo}${rotulo} (${restantes} ite${restantes > 1 ? "ns" : "m"})\n\n"${item.nomeExtraido}" — ${preco} (${item.mercado})\n\n${textoSugestoes}`,
    { reply_markup: { inline_keyboard: [...tecladoRevisaoItem(item.ref, sugestoes).inline_keyboard, ...linhasExtras] } }
  );
}

async function mostrarProximoComFonte(telegram, chatId, fonte, { rotulo, mensagemVazia }, messageId, prefixo = "", linhasExtras = []) {
  const item = await fonte.buscarProximo();
  if (!item) {
    // Teclado explícito (mesmo vazio): editMessageText sem reply_markup
    // manteria os botões da tela anterior.
    await enviarOuEditar(telegram, chatId, messageId, `${prefixo}${mensagemVazia}`, { reply_markup: { inline_keyboard: linhasExtras } });
    return;
  }

  const restantes = await fonte.contar();
  await renderizarItemDaFila(telegram, chatId, item, rotulo, restantes, messageId, prefixo, linhasExtras);
}

// Reexibe o MESMO item (buscado por id) em vez de "o próximo pendente" —
// usado depois de corrigir o nome e depois de desfazer uma escolha.
// buscarProximoComStatus usa limit(1) sem orderBy, então pedir o próximo
// poderia devolver um item diferente, dando a impressão de que a ação não
// teve efeito.
export async function mostrarItemDaFilaPorId(telegram, chatId, itemId, messageId, prefixo = "") {
  const item = await buscarItemRevisaoPorId(itemId);
  const rotulo = item.status === "ignorado" ? "⏭️ Adiados" : "📋 Revisão";
  const restantes = await contarComStatus(item.uid, item.status);
  await renderizarItemDaFila(telegram, chatId, { ...item, ref: `fila:${item.id}` }, rotulo, restantes, messageId, prefixo);
}

export async function mostrarProximaRevisao(telegram, chatId, uid, messageId, prefixo = "", linhasExtras = []) {
  await mostrarProximoComFonte(
    telegram,
    chatId,
    fonteFila(uid, "pendente"),
    { rotulo: "📋 Revisão", mensagemVazia: "Nenhum item pendente de revisão. 🎉" },
    messageId,
    prefixo,
    linhasExtras
  );
}

export async function mostrarProximoAdiado(telegram, chatId, uid, messageId, prefixo = "", linhasExtras = []) {
  await mostrarProximoComFonte(
    telegram,
    chatId,
    fonteFila(uid, "ignorado"),
    { rotulo: "⏭️ Adiados", mensagemVazia: "Nenhum item deixado para depois. 🎉" },
    messageId,
    prefixo,
    linhasExtras
  );
}

// Um item da fila de revisão pode vir da lista de pendentes normais ou da
// lista de "adiados" (mande /adiados) — depois de resolver/sugerir/corrigir
// um item, mostramos o próximo item da MESMA lista de onde ele veio.
export function mostrarProximoDaMesmaLista(telegram, chatId, item, messageId, prefixo = "", linhasExtras = []) {
  return item.status === "ignorado"
    ? mostrarProximoAdiado(telegram, chatId, item.uid, messageId, prefixo, linhasExtras)
    : mostrarProximaRevisao(telegram, chatId, item.uid, messageId, prefixo, linhasExtras);
}

// Fonte "lote" — usada pela etapa 3 da navegação do lote. Opera direto sobre
// o array itens[] do próprio documento do lote (nunca toca filaRevisaoNotas
// antes da etapa 4), mantendo o lote como única fonte de verdade durante a
// navegação. Um item "pendente" aqui é sem-match e ainda não revisado.
function itensSemMatchPendentes(lote) {
  return lote.itens.filter((i) => i.statusMatch === "sem_match" && !i.revisao?.status);
}

// Itens sem match que já receberam uma decisão nesta etapa (produto escolhido,
// sugestão, deixado para depois) — cada um ganha um botão "↩️" que devolve o
// item para a revisão, já que nada disso é gravado antes da etapa 4.
function itensSemMatchRevisados(lote) {
  return lote.itens.filter((i) => i.statusMatch === "sem_match" && i.revisao?.status);
}

export async function mostrarEtapa3(telegram, chatId, lote, messageId, prefixo = "") {
  const pendentes = itensSemMatchPendentes(lote);
  const revisados = itensSemMatchRevisados(lote);
  const dicaDesfazer = revisados.length ? "\n\nToque em ↩️ para desfazer uma escolha já feita." : "";
  if (!pendentes.length) {
    const texto = revisados.length ? "Todos os itens sem match já foram revisados." : "Nenhum item sem match aqui.";
    await enviarOuEditar(
      telegram,
      chatId,
      messageId,
      `${prefixo}Etapa 3/4 — Revisão dos itens sem match\n\n${texto}${dicaDesfazer}`,
      { reply_markup: tecladoEtapa3(lote.id, null, [], revisados) }
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
    `${prefixo}Etapa 3/4 — Revisão dos itens sem match (${pendentes.length} ite${pendentes.length > 1 ? "ns" : "m"})\n\n"${item.nomeExtraido}" — ${preco} (${lote.mercado})\n\n${textoSugestoes}${dicaDesfazer}`,
    { reply_markup: tecladoEtapa3(lote.id, item, sugestoes, revisados) }
  );
}
