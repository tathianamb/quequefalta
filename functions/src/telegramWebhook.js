import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { criarClienteTelegram } from "./telegram/api.js";
import { criarClienteGemini } from "./gemini/api.js";
import { tratarVincular } from "./comandos/vincular.js";
import { tratarTabela } from "./comandos/tabela.js";
import { tratarHelp } from "./comandos/help.js";
import { tratarCallback } from "./comandos/callback.js";
import { mostrarProximaRevisao, mostrarProximoAdiado, mostrarItemRenomeadoDaFila } from "./comandos/revisar.js";
import { mostrarEtapa } from "./comandos/etapasLote.js";
import { tratarCardapioManual, processarFeedbackCardapio } from "./comandos/cardapio.js";
import { abrirMenuPrincipal, processarTextoAguardado } from "./comandos/menuCasa.js";
import { tratarPergunta } from "./comandos/pergunta.js";
import { resolverUidPorChatId } from "./firestore/vinculos.js";
import { buscarLoteEmAberto, marcarLoteCancelado, atualizarItemDoLote } from "./firestore/lotes.js";
import { buscarItemAguardandoNome, atualizarNomeItemRevisao } from "./firestore/revisao.js";
import { buscarCardapioAguardandoFeedback, buscarPerfilCasa } from "./firestore/cardapio.js";
import { tecladoLotePendente } from "./telegram/teclados.js";
import { apagarSeExistir } from "./telegram/enviarOuEditar.js";

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_WEBHOOK_SECRET = defineSecret("TELEGRAM_WEBHOOK_SECRET");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// O Firebase CLI grava secrets via stdin no Windows sempre com \r\n ao final,
// então todo secret lido aqui precisa ser saneado antes de usar.
const limpar = (valor) => valor.trim();

const PEDIR_VINCULO =
  "Vincule sua conta primeiro: gere um código no app (Menu → Vincular Telegram) e mande /vincular 123456 aqui.";

async function processarUpdate(telegram, gemini, update) {
  if (update.callback_query) {
    await tratarCallback(telegram, update.callback_query);
    return;
  }

  if (!update.message?.text) return;

  const chatId = update.message.chat.id;
  const texto = update.message.text;

  if (texto.startsWith("/vincular")) {
    await tratarVincular(telegram, chatId, texto);
    return;
  }

  const uid = await resolverUidPorChatId(chatId);

  if (texto === "/start") {
    await telegram.enviarMensagem(
      chatId,
      uid
        ? "Você já está vinculado! Mande /help para ver os comandos disponíveis."
        : "Olá! Para começar, gere um código no app QueQueFalta (Menu → Vincular Telegram) e mande /vincular 123456 aqui."
    );
    return;
  }

  if (!uid) {
    await telegram.enviarMensagem(chatId, PEDIR_VINCULO);
    return;
  }

  const loteEmAberto = await buscarLoteEmAberto(chatId);

  if (texto === "/cancelar") {
    if (!loteEmAberto) {
      await telegram.enviarMensagem(chatId, "Não há nenhum lote pendente para cancelar.");
      return;
    }
    await marcarLoteCancelado(loteEmAberto.id);
    await telegram.enviarMensagem(chatId, "Lote cancelado. Nada foi gravado. Pode mandar /nota com uma nova tabela.");
    return;
  }

  if (texto === "/revisar") {
    await mostrarProximaRevisao(telegram, chatId, uid);
    return;
  }

  if (texto === "/adiados") {
    await mostrarProximoAdiado(telegram, chatId, uid);
    return;
  }

  if (texto.startsWith("/casa")) {
    await abrirMenuPrincipal(telegram, chatId, uid, null);
    return;
  }

  if (texto === "/cardapio") {
    await tratarCardapioManual(telegram, gemini, chatId, uid);
    return;
  }

  if (texto.startsWith("/pergunta")) {
    await tratarPergunta(telegram, gemini, chatId, uid, texto);
    return;
  }

  if (texto === "/help") {
    await tratarHelp(telegram, chatId);
    return;
  }

  if (texto.startsWith("/nota")) {
    const textoTabela = texto.replace(/^\/nota/, "").trim();
    if (loteEmAberto) {
      await telegram.enviarMensagem(chatId, "Ainda tem um lote aguardando sua confirmação.", {
        reply_markup: tecladoLotePendente(loteEmAberto.id),
      });
      return;
    }
    if (!textoTabela) {
      await telegram.enviarMensagem(
        chatId,
        "Cole a tabela junto, na mesma mensagem: /nota seguido do mercado + data na primeira linha e os itens abaixo."
      );
      return;
    }
    await tratarTabela(telegram, chatId, uid, textoTabela);
    return;
  }

  const itemLoteAguardandoNome = loteEmAberto?.itens.find((i) => i.revisao?.aguardandoNomeNovo);
  if (itemLoteAguardandoNome) {
    const { messageIdAguardandoNome: messageIdOriginal, messageIdPergunta } = itemLoteAguardandoNome.revisao || {};
    await atualizarItemDoLote(loteEmAberto.id, itemLoteAguardandoNome.indice, {
      nomeExtraido: texto.trim(),
      revisao: null,
    });
    // Apaga a pergunta ("Digite o nome correto...") e a resposta do usuário —
    // só o bloco principal (tela original, nunca editada até aqui) segue o
    // fluxo normal, sem deixar rastro da troca de pergunta/resposta no chat.
    await apagarSeExistir(telegram, chatId, messageIdPergunta);
    await apagarSeExistir(telegram, chatId, update.message.message_id);
    await mostrarEtapa(telegram, chatId, await buscarLoteEmAberto(chatId), messageIdOriginal);
    return;
  }

  const itemAguardandoNome = await buscarItemAguardandoNome(uid);
  if (itemAguardandoNome) {
    const { messageIdAguardandoNome: messageIdOriginal, messageIdPergunta } = itemAguardandoNome;
    await atualizarNomeItemRevisao(itemAguardandoNome.id, texto.trim());
    await apagarSeExistir(telegram, chatId, messageIdPergunta);
    await apagarSeExistir(telegram, chatId, update.message.message_id);
    await mostrarItemRenomeadoDaFila(telegram, chatId, itemAguardandoNome.id, messageIdOriginal);
    return;
  }

  const cardapioAguardandoFeedback = await buscarCardapioAguardandoFeedback(chatId);
  if (cardapioAguardandoFeedback) {
    await processarFeedbackCardapio(telegram, gemini, cardapioAguardandoFeedback, texto.trim());
    await apagarSeExistir(telegram, chatId, update.message.message_id);
    return;
  }

  const perfilCasa = await buscarPerfilCasa(uid);
  if (perfilCasa?.menuState?.aguardandoTexto) {
    await processarTextoAguardado(telegram, chatId, uid, texto.trim(), update.message.message_id);
    return;
  }

  await tratarHelp(telegram, chatId);
}

export const telegramWebhook = onRequest(
  {
    region: "southamerica-east1",
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (req, res) => {
    const secretRecebido = req.get("X-Telegram-Bot-Api-Secret-Token");
    if (secretRecebido !== limpar(TELEGRAM_WEBHOOK_SECRET.value())) {
      res.status(401).send("secret inválido");
      return;
    }

    const update = req.body;
    const telegram = criarClienteTelegram(limpar(TELEGRAM_BOT_TOKEN.value()));
    const gemini = criarClienteGemini(limpar(GEMINI_API_KEY.value()));

    // A resposta HTTP é sempre enviada aqui, uma única vez, depois que
    // processarUpdate() termina (com sucesso ou erro) — nenhum `return`
    // interno da lógica de negócio pode pular o envio da resposta, senão a
    // conexão fica pendurada até o Cloud Run estourar o timeout (bug real
    // que já causou isso: cada `return` dentro de um try/catch no nível do
    // handler pulava a linha final de res.send()).
    try {
      await processarUpdate(telegram, gemini, update);
    } catch (erro) {
      console.error("Erro ao processar update do Telegram:", erro);
      const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
      if (chatId) {
        await telegram
          .enviarMensagem(chatId, "Ocorreu um erro ao processar sua solicitação. Tente novamente.")
          .catch(() => {});
      }
    }

    res.status(200).send("ok");
  }
);
