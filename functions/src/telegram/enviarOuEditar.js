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
