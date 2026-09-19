// Toda navegação por botão (trocar etapa, remover match, revisar item) edita
// a mensagem existente em vez de mandar uma nova — dá a sensação de "virar
// página" ao invés de empilhar mensagens no chat. Passe `messageId` quando a
// ação vier de um callback_query (editável); omita para o primeiro envio de
// uma tela nova (ex: ao processar uma tabela recém-colada).
export function enviarOuEditar(telegram, chatId, messageId, texto, opcoes = {}) {
  if (messageId) {
    return telegram.editarMensagem(chatId, messageId, texto, opcoes);
  }
  return telegram.enviarMensagem(chatId, texto, opcoes);
}

// Usado ao resolver uma pergunta de texto livre (ex: "Digite o nome correto",
// "Digite: Nome: restrições") — apaga tanto a pergunta quanto a resposta do
// usuário do chat, best-effort, para não deixar rastro da troca no histórico.
export function apagarSeExistir(telegram, chatId, messageId) {
  if (!messageId) return Promise.resolve();
  return telegram.apagarMensagem(chatId, messageId).catch(() => {});
}
