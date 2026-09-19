const TEXTO_HELP = [
  "📋 Comandos disponíveis:",
  "",
  "/vincular 123456 — vincula sua conta usando o código gerado no app.",
  "/nota — cole junto, na mesma mensagem, a tabela da sua compra (mercado + data na primeira linha, itens abaixo) para registrar os preços.",
  "/revisar — revisa itens sem match pendentes.",
  "/adiados — revisa itens deixados para depois.",
  "/cancelar — cancela o lote de nota fiscal em aberto.",
  "/casa — configura o perfil da casa (pessoas, horário, refeições, observações).",
  "/cardapio — gera uma sugestão de cardápio agora.",
  "/feedback_cardapio <texto> — ajusta a última sugestão de cardápio com base no seu feedback (ex: \"/feedback_cardapio sem peixe amanhã\").",
  "/pergunta <texto> — faz uma pergunta pontual ao assistente (ex: \"/pergunta sobremesa rápida com o que tenho em casa\").",
  "/help — mostra esta lista de comandos.",
].join("\n");

export async function tratarHelp(telegram, chatId) {
  await telegram.enviarMensagem(chatId, TEXTO_HELP);
}
