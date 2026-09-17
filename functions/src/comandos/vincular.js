import { vincularChatComCodigo } from "../firestore/vinculos.js";

const MENSAGENS_ERRO = {
  codigo_invalido: "Código não encontrado. Confira o código gerado no app e tente de novo.",
  codigo_ja_usado: "Esse código já foi usado. Gere um novo código no app (Menu → Vincular Telegram).",
  codigo_expirado: "Esse código expirou. Gere um novo código no app (Menu → Vincular Telegram).",
};

export async function tratarVincular(telegram, chatId, textoComando) {
  const codigo = textoComando.replace("/vincular", "").trim();

  if (!/^\d{6}$/.test(codigo)) {
    await telegram.enviarMensagem(
      chatId,
      "Use: /vincular 123456 (o código de 6 dígitos gerado no app, em Menu → Vincular Telegram)."
    );
    return;
  }

  const resultado = await vincularChatComCodigo(chatId, codigo);

  if (!resultado.sucesso) {
    await telegram.enviarMensagem(chatId, MENSAGENS_ERRO[resultado.motivo]);
    return;
  }

  await telegram.enviarMensagem(
    chatId,
    "Conta vinculada! Agora você pode mandar fotos de notas fiscais para registrar preços no QueQueFalta."
  );
}
