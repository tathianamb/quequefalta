const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export function criarClienteTelegram(botToken) {
  const base = `${TELEGRAM_API_BASE}${botToken}`;

  async function chamar(metodo, payload) {
    const resposta = await fetch(`${base}/${metodo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const dados = await resposta.json();
    if (!dados.ok) {
      throw new Error(`Telegram API ${metodo} falhou: ${dados.description}`);
    }
    return dados.result;
  }

  return {
    enviarMensagem(chatId, texto, opcoes = {}) {
      return chamar("sendMessage", { chat_id: chatId, text: texto, ...opcoes });
    },
    async editarMensagem(chatId, messageId, texto, opcoes = {}) {
      try {
        return await chamar("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: texto,
          ...opcoes,
        });
      } catch (erro) {
        // O Telegram rejeita a edição se o texto+teclado forem idênticos ao
        // que já está na mensagem (ex: cliques rápidos/duplicados) — não é
        // um erro real, só não há nada para atualizar.
        if (erro.message.includes("message is not modified")) return null;
        throw erro;
      }
    },
    responderCallback(callbackQueryId, opcoes = {}) {
      return chamar("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        ...opcoes,
      });
    },
    async apagarMensagem(chatId, messageId) {
      try {
        return await chamar("deleteMessage", { chat_id: chatId, message_id: messageId });
      } catch (erro) {
        // Apagar é sempre "best effort" — mensagens com mais de 48h não podem
        // ser deletadas pela Bot API, e isso não deve interromper o fluxo.
        if (erro.message.includes("message to delete not found") || erro.message.includes("message can't be deleted")) {
          return null;
        }
        throw erro;
      }
    },
    obterArquivo(fileId) {
      return chamar("getFile", { file_id: fileId });
    },
    urlDownloadArquivo(filePath) {
      return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    },
  };
}
