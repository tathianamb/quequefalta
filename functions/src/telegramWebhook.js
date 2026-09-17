import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { criarClienteTelegram } from "./telegram/api.js";
import { tratarVincular } from "./comandos/vincular.js";
import { tratarTabela } from "./comandos/tabela.js";
import { tratarCallback } from "./comandos/callback.js";
import { mostrarProximaRevisao, mostrarProximoAdiado, mostrarItemRenomeadoDaFila } from "./comandos/revisar.js";
import { mostrarEtapa } from "./comandos/etapasLote.js";
import { resolverUidPorChatId } from "./firestore/vinculos.js";
import { buscarLoteEmAberto, marcarLoteCancelado, atualizarItemDoLote } from "./firestore/lotes.js";
import { buscarItemAguardandoNome, atualizarNomeItemRevisao } from "./firestore/revisao.js";
import { tecladoLotePendente } from "./telegram/teclados.js";

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_WEBHOOK_SECRET = defineSecret("TELEGRAM_WEBHOOK_SECRET");

// O Firebase CLI grava secrets via stdin no Windows sempre com \r\n ao final,
// então todo secret lido aqui precisa ser saneado antes de usar.
const limpar = (valor) => valor.trim();

// Uma tabela sempre tem várias linhas (mercado+data, cabeçalho opcional, itens) —
// mensagens de 1 linha nunca são tabela, então tratamos como texto solto direto.
function podeSerTabela(texto) {
  return texto.split("\n").filter((l) => l.trim()).length >= 2;
}

const PEDIR_VINCULO =
  "Vincule sua conta primeiro: gere um código no app (Menu → Vincular Telegram) e mande /vincular 123456 aqui.";

async function processarUpdate(telegram, update) {
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
        ? "Você já está vinculado! Cole a tabela da sua compra (mercado + data na primeira linha, itens copiados da planilha) para registrar os preços."
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
    await telegram.enviarMensagem(chatId, "Lote cancelado. Nada foi gravado. Pode mandar uma nova tabela.");
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

  const itemLoteAguardandoNome = loteEmAberto?.itens.find((i) => i.revisao?.aguardandoNomeNovo);
  if (itemLoteAguardandoNome) {
    await atualizarItemDoLote(loteEmAberto.id, itemLoteAguardandoNome.indice, {
      nomeExtraido: texto.trim(),
      revisao: null,
    });
    await telegram.enviarMensagem(chatId, `Nome atualizado para "${texto.trim()}".`);
    await mostrarEtapa(telegram, chatId, await buscarLoteEmAberto(chatId));
    return;
  }

  const itemAguardandoNome = await buscarItemAguardandoNome(uid);
  if (itemAguardandoNome) {
    await atualizarNomeItemRevisao(itemAguardandoNome.id, texto.trim());
    await telegram.enviarMensagem(chatId, `Nome atualizado para "${texto.trim()}".`);
    await mostrarItemRenomeadoDaFila(telegram, chatId, itemAguardandoNome.id);
    return;
  }

  if (podeSerTabela(texto)) {
    if (loteEmAberto) {
      await telegram.enviarMensagem(chatId, "Ainda tem um lote aguardando sua confirmação.", {
        reply_markup: tecladoLotePendente(loteEmAberto.id),
      });
      return;
    }

    await tratarTabela(telegram, chatId, uid, texto);
    return;
  }

  await telegram.enviarMensagem(
    chatId,
    "Não entendi essa mensagem. Cole a tabela da sua compra (mercado + data na primeira linha, itens abaixo) para registrar os preços."
  );
}

export const telegramWebhook = onRequest(
  {
    region: "southamerica-east1",
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET],
    timeoutSeconds: 60,
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

    // A resposta HTTP é sempre enviada aqui, uma única vez, depois que
    // processarUpdate() termina (com sucesso ou erro) — nenhum `return`
    // interno da lógica de negócio pode pular o envio da resposta, senão a
    // conexão fica pendurada até o Cloud Run estourar o timeout (bug real
    // que já causou isso: cada `return` dentro de um try/catch no nível do
    // handler pulava a linha final de res.send()).
    try {
      await processarUpdate(telegram, update);
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
