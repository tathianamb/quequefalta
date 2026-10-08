import { buscarPerfilCasa, obterItensComprados } from "../firestore/cardapio.js";
import { montarPromptPergunta } from "../gemini/prompt.js";
import { mensagemDeErro } from "../gemini/erros.js";
import { adquirirTravaGemini, liberarTravaGemini } from "../firestore/travaGemini.js";

export async function tratarPergunta(telegram, gemini, chatId, uid, textoComando) {
  const pergunta = textoComando.replace(/^\/pergunta/, "").trim();

  if (!pergunta) {
    await telegram.enviarMensagem(
      chatId,
      'Use: /pergunta seguido da sua pergunta, ex: "/pergunta sobremesa rápida com o que tenho em casa".'
    );
    return;
  }

  if (!(await adquirirTravaGemini(uid))) {
    await telegram.enviarMensagem(chatId, "Aguarde alguns segundos antes de enviar outra pergunta.");
    return;
  }

  let falhou = false;
  try {
    const [perfil, itensEmCasa] = await Promise.all([buscarPerfilCasa(uid), obterItensComprados(uid)]);

    const prompt = montarPromptPergunta({
      pessoas: perfil?.pessoas || [],
      observacoesGerais: perfil?.observacoesGerais || "",
      itensEmCasa,
      pergunta,
    });

    let resposta;
    try {
      resposta = await gemini.gerarTexto(prompt);
    } catch (erro) {
      console.error("Erro ao responder pergunta:", erro);
      falhou = true;
      await telegram.enviarMensagem(chatId, mensagemDeErro(erro));
      return;
    }

    await telegram.enviarMensagem(chatId, resposta);
  } finally {
    await liberarTravaGemini(uid, { falhou });
  }
}
