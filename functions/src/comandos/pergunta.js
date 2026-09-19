import { buscarPerfilCasa, obterItensComprados } from "../firestore/cardapio.js";
import { montarPromptPergunta } from "../gemini/prompt.js";
import { mensagemDeErro } from "../gemini/erros.js";

export async function tratarPergunta(telegram, gemini, chatId, uid, textoComando) {
  const pergunta = textoComando.replace(/^\/pergunta/, "").trim();

  if (!pergunta) {
    await telegram.enviarMensagem(
      chatId,
      'Use: /pergunta seguido da sua pergunta, ex: "/pergunta sobremesa rápida com o que tenho em casa".'
    );
    return;
  }

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
    await telegram.enviarMensagem(chatId, mensagemDeErro(erro));
    return;
  }

  await telegram.enviarMensagem(chatId, resposta);
}
