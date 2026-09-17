import {
  buscarPerfilCasa,
  salvarPerfilCasa,
  obterItensComprados,
  buscarCardapioDoDia,
  criarCardapioDoDia,
  marcarErroCardapio,
  registrarFeedbackCardapio,
  marcarMessageId,
} from "../firestore/cardapio.js";
import { parsearPerfilCasa, formatarPerfilCasa } from "../parser/perfilCasa.js";
import { montarPromptInicial, montarPromptRefinamento } from "../gemini/prompt.js";

const MENSAGEM_ERRO_GEMINI = {
  gemini_quota_excedida: "Cheguei ao limite de uso do Gemini por hoje. Tente de novo mais tarde.",
};

function mensagemDeErro(erro) {
  return MENSAGEM_ERRO_GEMINI[erro.message] || "Não consegui gerar o cardápio agora. Tente de novo em instantes.";
}

export async function tratarCasa(telegram, chatId, uid, textoComando) {
  const corpo = textoComando.replace(/^\/casa/, "").trim();

  if (!corpo) {
    const perfil = await buscarPerfilCasa(uid);
    await telegram.enviarMensagem(chatId, formatarPerfilCasa(perfil));
    return;
  }

  const perfilAnterior = await buscarPerfilCasa(uid);
  const { pessoas, observacoesGerais, horarioEnvio, erros } = parsearPerfilCasa(corpo, perfilAnterior);

  if (!pessoas.length && !perfilAnterior?.pessoas?.length) {
    await telegram.enviarMensagem(
      chatId,
      'Não consegui reconhecer nenhuma pessoa no texto. Use o formato "Nome: restrições/preferências separadas por ;", uma pessoa por linha.'
    );
    return;
  }

  const pessoasFinais = pessoas.length ? pessoas : perfilAnterior.pessoas;
  await salvarPerfilCasa(uid, { pessoas: pessoasFinais, observacoesGerais, horarioEnvio, chatId });

  const perfilSalvo = await buscarPerfilCasa(uid);
  const aviso = erros.length ? `\n\n⚠️ ${erros.join("\n")}` : "";
  await telegram.enviarMensagem(chatId, `Perfil salvo!\n\n${formatarPerfilCasa(perfilSalvo)}${aviso}`);
}

export async function tratarCardapioManual(telegram, gemini, chatId, uid) {
  const perfil = await buscarPerfilCasa(uid);
  if (!perfil?.pessoas?.length) {
    await telegram.enviarMensagem(
      chatId,
      "Configure o perfil da casa primeiro com /casa antes de pedir um cardápio."
    );
    return;
  }

  await telegram.enviarMensagem(chatId, "🔄 Gerando cardápio...");
  await gerarCardapioInicial(telegram, gemini, uid, chatId, { forcar: true });
}

function dataDeAmanha() {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return amanha.toISOString().slice(0, 10);
}

// forcar=true ignora o cardápio já existente do dia e gera um novo do zero —
// usado pelo comando manual /cardapio. O scheduler chama sem forcar, para
// não duplicar geração/envio em reruns do Cloud Scheduler (idempotência).
export async function gerarCardapioInicial(telegram, gemini, uid, chatId, { forcar = false } = {}) {
  const dataIso = dataDeAmanha();

  if (!forcar) {
    const existente = await buscarCardapioDoDia(uid, dataIso);
    if (existente) return;
  }

  const [perfil, itensEmCasa] = await Promise.all([buscarPerfilCasa(uid), obterItensComprados(uid)]);

  const promptContexto = {
    pessoas: perfil?.pessoas || [],
    observacoesGerais: perfil?.observacoesGerais || "",
    itensEmCasa,
  };
  const prompt = montarPromptInicial(promptContexto);

  let resposta;
  try {
    resposta = await gemini.gerarCardapio(prompt);
  } catch (erro) {
    console.error("Erro ao gerar cardápio inicial:", erro);
    const cardapioId = await criarCardapioDoDia(uid, dataIso, {
      chatId,
      promptContexto,
      prompt,
      resposta: null,
    });
    await marcarErroCardapio(cardapioId, erro.message);
    await telegram.enviarMensagem(chatId, mensagemDeErro(erro));
    return;
  }

  const cardapioId = await criarCardapioDoDia(uid, dataIso, { chatId, promptContexto, prompt, resposta });
  const mensagemTexto = `🍽️ Sugestão de cardápio para amanhã:\n\n${resposta}\n\nResponda com um feedback (ex: "sem peixe amanhã") para eu ajustar a sugestão.`;
  const mensagemEnviada = await telegram.enviarMensagem(chatId, mensagemTexto);
  await marcarMessageId(cardapioId, mensagemEnviada.message_id);
}

export async function processarFeedbackCardapio(telegram, gemini, cardapio, textoFeedback) {
  await telegram.editarMensagem(cardapio.chatId, cardapio.messageId, "🔄 Gerando novo cardápio com seu feedback...");

  const prompt = montarPromptRefinamento({
    pessoas: cardapio.promptContexto.pessoas,
    observacoesGerais: cardapio.promptContexto.observacoesGerais,
    itensEmCasa: cardapio.promptContexto.itensEmCasa,
    historico: cardapio.historico,
    feedbackNovo: textoFeedback,
  });

  let resposta;
  try {
    resposta = await gemini.gerarCardapio(prompt);
  } catch (erro) {
    console.error("Erro ao refinar cardápio:", erro);
    await telegram.editarMensagem(cardapio.chatId, cardapio.messageId, mensagemDeErro(erro));
    return;
  }

  await registrarFeedbackCardapio(cardapio.id, { feedbackUsuario: textoFeedback, prompt, resposta });

  const mensagemTexto = `🍽️ Cardápio ajustado:\n\n${resposta}\n\nResponda com outro feedback se quiser ajustar de novo.`;
  await telegram.editarMensagem(cardapio.chatId, cardapio.messageId, mensagemTexto);
}
