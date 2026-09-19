import {
  buscarPerfilCasa,
  atualizarMenuState,
  limparAguardandoTexto,
  atualizarPessoa,
  removerPessoa,
  salvarPerfilCasa,
} from "../firestore/cardapio.js";
import {
  tecladoMenuPrincipal,
  tecladoPessoas,
  tecladoHorarios,
  tecladoRefeicoes,
  REFEICOES,
} from "../telegram/tecladosCasa.js";
import { enviarOuEditar, apagarSeExistir } from "../telegram/enviarOuEditar.js";

function formatarResumoPessoas(pessoas) {
  if (!pessoas?.length) return "Nenhuma pessoa cadastrada ainda.";
  return pessoas
    .map((p) => `- ${p.nome}${p.restricoes?.length ? `: ${p.restricoes.join("; ")}` : ""}`)
    .join("\n");
}

function textoTelaPrincipal(perfil) {
  return [
    "⚙️ Configuração da casa",
    "",
    formatarResumoPessoas(perfil?.pessoas),
    "",
    `Horário de envio: ${perfil?.horarioEnvio || "22:00"}`,
    `Refeições: ${(perfil?.refeicoes || REFEICOES).join(", ")}`,
    perfil?.observacoesGerais ? `Observações: ${perfil.observacoesGerais}` : "Observações: nenhuma",
  ].join("\n");
}

function textoTelaPessoas(perfil) {
  return `👨‍👩‍👧 Pessoas da casa:\n\n${formatarResumoPessoas(perfil?.pessoas)}`;
}

// Mesmo padrão de mostrarEtapa (etapasLote.js): dispatch por tela, cada uma
// monta texto + chama enviarOuEditar com o teclado correspondente.
export async function mostrarTelaMenu(telegram, chatId, perfil, tela, messageId, prefixo = "") {
  const telas = {
    principal: () =>
      enviarOuEditar(telegram, chatId, messageId, `${prefixo}${textoTelaPrincipal(perfil)}`, {
        reply_markup: tecladoMenuPrincipal(),
      }),
    pessoas: () =>
      enviarOuEditar(telegram, chatId, messageId, `${prefixo}${textoTelaPessoas(perfil)}`, {
        reply_markup: tecladoPessoas(perfil?.pessoas),
      }),
    horario: () =>
      enviarOuEditar(
        telegram,
        chatId,
        messageId,
        `${prefixo}🕒 Horário de envio atual: ${perfil?.horarioEnvio || "22:00"}\n\nEscolha um novo horário (aproximado, na hora cheia):`,
        { reply_markup: tecladoHorarios() }
      ),
    refeicoes: () =>
      enviarOuEditar(
        telegram,
        chatId,
        messageId,
        `${prefixo}🍽️ Escolha as refeições que devem aparecer no cardápio:`,
        { reply_markup: tecladoRefeicoes(perfil?.menuState?.refeicoesRascunho) }
      ),
    observacoes: () =>
      enviarOuEditar(
        telegram,
        chatId,
        messageId,
        `${prefixo}📝 Observações atuais: ${perfil?.observacoesGerais || "nenhuma"}`,
        { reply_markup: { inline_keyboard: [[{ text: "⬅️ Voltar", callback_data: "casa_menu" }]] } }
      ),
  };
  return telas[tela]();
}

export async function abrirMenuPrincipal(telegram, chatId, uid, messageId) {
  const perfil = await buscarPerfilCasa(uid);
  const mensagem = await mostrarTelaMenu(telegram, chatId, perfil, "principal", messageId);
  const messageIdFinal = messageId || mensagem?.message_id;
  await atualizarMenuState(uid, { tela: "principal", messageId: messageIdFinal, aguardandoTexto: null });
}

export async function abrirTelaPessoas(telegram, chatId, uid, messageId) {
  const perfil = await buscarPerfilCasa(uid);
  await mostrarTelaMenu(telegram, chatId, perfil, "pessoas", messageId);
  await atualizarMenuState(uid, { tela: "pessoas", messageId });
}

export async function abrirTelaHorario(telegram, chatId, uid, messageId) {
  const perfil = await buscarPerfilCasa(uid);
  await mostrarTelaMenu(telegram, chatId, perfil, "horario", messageId);
  await atualizarMenuState(uid, { tela: "horario", messageId });
}

export async function abrirTelaRefeicoes(telegram, chatId, uid, messageId) {
  const perfil = await buscarPerfilCasa(uid);
  const rascunho = perfil?.menuState?.refeicoesRascunho || perfil?.refeicoes || REFEICOES;
  await atualizarMenuState(uid, { tela: "refeicoes", messageId, refeicoesRascunho: rascunho });
  const perfilAtualizado = await buscarPerfilCasa(uid);
  await mostrarTelaMenu(telegram, chatId, perfilAtualizado, "refeicoes", messageId);
}

export async function pedirTextoPessoa(telegram, chatId, uid, indice, messageId) {
  const pergunta = await telegram.enviarMensagem(
    chatId,
    'Digite: Nome: restrição1; restrição2\n\n(ex: "Tathiana: sem lactose; gosta de apimentado")'
  );
  await atualizarMenuState(uid, {
    aguardandoTexto: {
      tipo: indice === null ? "pessoa_incluir" : "pessoa_editar",
      indice,
      messageIdPergunta: pergunta.message_id,
    },
    messageId,
  });
}

export async function pedirTextoObservacoes(telegram, chatId, uid, messageId) {
  const pergunta = await telegram.enviarMensagem(chatId, "Digite as observações gerais da casa:");
  await atualizarMenuState(uid, {
    aguardandoTexto: { tipo: "observacoes", indice: null, messageIdPergunta: pergunta.message_id },
    messageId,
  });
}

export async function removerPessoaEMostrar(telegram, chatId, uid, indice, messageId) {
  await removerPessoa(uid, indice);
  await abrirTelaPessoas(telegram, chatId, uid, messageId);
}

export async function definirHorarioEMostrar(telegram, chatId, uid, hh, messageId) {
  const perfil = await buscarPerfilCasa(uid);
  await salvarPerfilCasa(uid, {
    pessoas: perfil?.pessoas || [],
    observacoesGerais: perfil?.observacoesGerais || "",
    refeicoes: perfil?.refeicoes || REFEICOES,
    horarioEnvio: `${hh}:00`,
    chatId,
  });
  await abrirMenuPrincipal(telegram, chatId, uid, messageId);
}

export async function toggleRefeicaoEMostrar(telegram, chatId, uid, indiceRefeicao, messageId) {
  const perfil = await buscarPerfilCasa(uid);
  const refeicao = REFEICOES[indiceRefeicao];
  const rascunhoAtual = perfil?.menuState?.refeicoesRascunho || perfil?.refeicoes || REFEICOES;
  const novoRascunho = rascunhoAtual.includes(refeicao)
    ? rascunhoAtual.filter((r) => r !== refeicao)
    : [...rascunhoAtual, refeicao];

  await atualizarMenuState(uid, { refeicoesRascunho: novoRascunho });
  const perfilAtualizado = await buscarPerfilCasa(uid);
  await mostrarTelaMenu(telegram, chatId, perfilAtualizado, "refeicoes", messageId);
}

export async function confirmarRefeicoesEMostrar(telegram, chatId, uid, messageId) {
  const perfil = await buscarPerfilCasa(uid);
  const refeicoesEscolhidas = perfil?.menuState?.refeicoesRascunho?.length
    ? perfil.menuState.refeicoesRascunho
    : REFEICOES;

  await salvarPerfilCasa(uid, {
    pessoas: perfil?.pessoas || [],
    observacoesGerais: perfil?.observacoesGerais || "",
    horarioEnvio: perfil?.horarioEnvio || "22:00",
    refeicoes: refeicoesEscolhidas,
    chatId,
  });
  await atualizarMenuState(uid, { refeicoesRascunho: null });
  await abrirMenuPrincipal(telegram, chatId, uid, messageId);
}

function parsearLinhaPessoa(texto) {
  const separador = texto.indexOf(":");
  if (separador === -1) return { nome: texto.trim(), restricoes: [], preferencias: [] };

  const nome = texto.slice(0, separador).trim();
  const restricoes = texto
    .slice(separador + 1)
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean);
  return { nome, restricoes, preferencias: [] };
}

export async function processarTextoAguardado(telegram, chatId, uid, textoUsuario, messageIdUsuario) {
  const perfil = await buscarPerfilCasa(uid);
  const aguardando = perfil?.menuState?.aguardandoTexto;
  if (!aguardando) return;

  const messageIdOriginal = perfil.menuState.messageId;

  if (aguardando.tipo === "observacoes") {
    await salvarPerfilCasa(uid, {
      pessoas: perfil?.pessoas || [],
      horarioEnvio: perfil?.horarioEnvio || "22:00",
      refeicoes: perfil?.refeicoes || REFEICOES,
      observacoesGerais: textoUsuario,
      chatId,
    });
  } else {
    const dadosPessoa = parsearLinhaPessoa(textoUsuario);
    const indice = aguardando.tipo === "pessoa_incluir" ? (perfil.pessoas?.length || 0) : aguardando.indice;
    await atualizarPessoa(uid, indice, dadosPessoa);
  }

  await apagarSeExistir(telegram, chatId, aguardando.messageIdPergunta);
  await apagarSeExistir(telegram, chatId, messageIdUsuario);
  await limparAguardandoTexto(uid);

  const telaOriginal = aguardando.tipo === "observacoes" ? "observacoes" : "pessoas";
  const perfilAtualizado = await buscarPerfilCasa(uid);
  await mostrarTelaMenu(telegram, chatId, perfilAtualizado, telaOriginal, messageIdOriginal);
}

export async function tratarCallbackCasa(telegram, chatId, uid, acao, params, messageId) {
  if (acao === "casa_menu") {
    await abrirMenuPrincipal(telegram, chatId, uid, messageId);
  } else if (acao === "casa_pessoas") {
    await abrirTelaPessoas(telegram, chatId, uid, messageId);
  } else if (acao === "casa_pessoa_incluir") {
    await pedirTextoPessoa(telegram, chatId, uid, null, messageId);
  } else if (acao === "casa_pessoa_editar") {
    await pedirTextoPessoa(telegram, chatId, uid, Number(params[0]), messageId);
  } else if (acao === "casa_pessoa_remover") {
    await removerPessoaEMostrar(telegram, chatId, uid, Number(params[0]), messageId);
  } else if (acao === "casa_horario") {
    await abrirTelaHorario(telegram, chatId, uid, messageId);
  } else if (acao === "casa_horario_set") {
    await definirHorarioEMostrar(telegram, chatId, uid, params[0], messageId);
  } else if (acao === "casa_refeicoes") {
    await abrirTelaRefeicoes(telegram, chatId, uid, messageId);
  } else if (acao === "casa_refeicao_toggle") {
    await toggleRefeicaoEMostrar(telegram, chatId, uid, Number(params[0]), messageId);
  } else if (acao === "casa_refeicoes_confirmar") {
    await confirmarRefeicoesEMostrar(telegram, chatId, uid, messageId);
  } else if (acao === "casa_observacoes") {
    await pedirTextoObservacoes(telegram, chatId, uid, messageId);
  }
}
