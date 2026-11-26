import { TEMPLATE_CURTO } from "../parser/nota.js";

const TEXTO_HELP = [
  "📋 Comandos disponíveis:",
  "",
  "/vincular 123456 — vincula sua conta usando o código gerado no app.",
  "/nota — registra os preços de uma compra. Mande a nota na mesma mensagem (modelo abaixo).",
  "/revisar — revisa itens sem match pendentes.",
  "/adiados — revisa itens deixados para depois.",
  "/cancelar — cancela o lote de nota fiscal em aberto.",
  "/help — mostra esta lista de comandos.",
  "",
  "Modelo do /nota (campos dos itens separados por ; ou tab; desc e pago podem ficar vazios; marca e tam são opcionais, marca - = sem marca):",
  "",
  TEMPLATE_CURTO,
].join("\n");

export async function tratarHelp(telegram, chatId) {
  await telegram.enviarMensagem(chatId, TEXTO_HELP);
}
