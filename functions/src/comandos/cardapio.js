import { buscarPerfilCasa, obterItensComprados, marcarCardapioEnviado } from "../firestore/cardapio.js";
import { montarPromptInicial, montarPromptRefinamento } from "../gemini/prompt.js";
import { mensagemDeErro } from "../gemini/erros.js";

// O cardápio não é guardado no Firestore: a conversa no Telegram é o
// registro. Toda mensagem de cardápio do bot começa com este prefixo, e é por
// ele que uma resposta (reply) é reconhecida como feedback de cardápio.
const PREFIXO_CARDAPIO = "🍽️";
const CABECALHO_INICIAL = `${PREFIXO_CARDAPIO} Sugestão de cardápio para amanhã:`;
const CABECALHO_AJUSTADO = `${PREFIXO_CARDAPIO} Cardápio ajustado:`;
const RODAPE_FEEDBACK =
  'Para ajustar, responda a esta mensagem dizendo o que mudar (ex: "sem peixe amanhã").';
const COMO_DAR_FEEDBACK =
  'Para ajustar um cardápio, responda à mensagem dele (a que começa com 🍽️) dizendo o que mudar, ex: "sem peixe amanhã". Também vale responder com /feedback_cardapio seguido do texto.';

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

async function montarContexto(uid, perfil) {
  return {
    pessoas: perfil?.pessoas || [],
    observacoesGerais: perfil?.observacoesGerais || "",
    refeicoes: perfil?.refeicoes || ["café da manhã", "almoço", "jantar"],
    itensEmCasa: await obterItensComprados(uid),
  };
}

// forcar=true ignora o marcador e gera de novo — usado pelo comando manual
// /cardapio. O agendador chama sem forcar e pula se perfilCasa/{uid}
// .ultimoCardapioPara já é a data de amanhã, para não reenviar em reruns do
// Cloud Scheduler (idempotência).
export async function gerarCardapioInicial(telegram, gemini, uid, chatId, { forcar = false } = {}) {
  const dataIso = dataDeAmanha();
  const perfil = await buscarPerfilCasa(uid);

  if (!forcar && perfil?.ultimoCardapioPara === dataIso) return;

  const prompt = montarPromptInicial(await montarContexto(uid, perfil));

  let resposta;
  try {
    resposta = await gemini.gerarTexto(prompt);
  } catch (erro) {
    console.error("Erro ao gerar cardápio inicial:", erro);
    await telegram.enviarMensagem(chatId, mensagemDeErro(erro));
    return;
  }

  await telegram.enviarMensagem(chatId, `${CABECALHO_INICIAL}\n\n${resposta}\n\n${RODAPE_FEEDBACK}`);
  await marcarCardapioEnviado(uid, dataIso);
}

// Texto livre só é feedback quando é resposta a uma mensagem de cardápio do
// próprio bot. Nunca trate texto solto como feedback: quando o bot ficava
// "escutando" feedback depois de mandar um cardápio, um cardápio nunca
// respondido sequestrava qualquer mensagem de texto futura, de qualquer fluxo.
export function ehRespostaACardapio(mensagem) {
  const original = mensagem?.reply_to_message;
  return Boolean(original?.from?.is_bot && original.text?.startsWith(PREFIXO_CARDAPIO));
}

// Tira o cabeçalho e o rodapé de instruções, deixando só o cardápio em si.
function extrairCardapio(textoMensagem) {
  const semCabecalho = textoMensagem.replace(/^.*\n/, "");
  const fimRodape = semCabecalho.lastIndexOf("\n\nPara ajustar,");
  const corpo = fimRodape >= 0 ? semCabecalho.slice(0, fimRodape) : semCabecalho;
  return corpo.trim();
}

// Aceita /feedback_cardapio <texto> ou texto livre, sempre como resposta à
// mensagem do cardápio. A versão ajustada vai como mensagem nova (resposta à
// anterior), não edição, para a conversa ficar registrada.
export async function tratarFeedbackCardapio(telegram, gemini, chatId, uid, mensagem) {
  const textoFeedback = mensagem.text.replace(/^\/feedback_cardapio(@\S+)?/, "").trim();

  if (!ehRespostaACardapio(mensagem) || !textoFeedback) {
    await telegram.enviarMensagem(chatId, COMO_DAR_FEEDBACK);
    return;
  }

  const original = mensagem.reply_to_message;
  const responderAoCardapio = {
    reply_parameters: { message_id: original.message_id, allow_sending_without_reply: true },
  };

  const aviso = await telegram.enviarMensagem(chatId, "🔄 Ajustando o cardápio com seu feedback...");

  const prompt = montarPromptRefinamento({
    ...(await montarContexto(uid, await buscarPerfilCasa(uid))),
    cardapioAnterior: extrairCardapio(original.text),
    feedback: textoFeedback,
  });

  let resposta;
  try {
    resposta = await gemini.gerarTexto(prompt);
  } catch (erro) {
    console.error("Erro ao refinar cardápio:", erro);
    await telegram.apagarMensagem(chatId, aviso.message_id);
    await telegram.enviarMensagem(chatId, mensagemDeErro(erro), responderAoCardapio);
    return;
  }

  await telegram.apagarMensagem(chatId, aviso.message_id);
  await telegram.enviarMensagem(
    chatId,
    `${CABECALHO_AJUSTADO}\n\n${resposta}\n\n${RODAPE_FEEDBACK}`,
    responderAoCardapio
  );
}
