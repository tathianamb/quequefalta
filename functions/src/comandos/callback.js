import { getFirestore } from "firebase-admin/firestore";
import {
  buscarLotePorId,
  marcarLoteConfirmado,
  marcarLoteCancelado,
  atualizarItemDoLote,
  definirEtapaDoLote,
} from "../firestore/lotes.js";
import { registrarPreco, obterListaAtivaDoUsuario, produtoJaTemRegistro } from "../firestore/historico.js";
import {
  adicionarNaFilaDeRevisao,
  buscarItemRevisaoPorId,
  resolverItemRevisao,
  ignorarItemRevisao,
  marcarAguardandoNomeNovo,
  marcarItemComoSugerido,
} from "../firestore/revisao.js";
import { criarSugestaoDeProduto } from "../firestore/sugestoes.js";
import { mostrarProximoDaMesmaLista } from "./revisar.js";
import { mostrarEtapa } from "./etapasLote.js";

export async function tratarCallback(telegram, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const [acao, ...params] = callbackQuery.data.split(":");

  await telegram.responderCallback(callbackQuery.id);

  if (acao === "lote_ant") {
    await navegarEtapa(telegram, chatId, params[0], -1, messageId);
  } else if (acao === "lote_prox") {
    await navegarEtapa(telegram, chatId, params[0], 1, messageId);
  } else if (acao === "lote_fin") {
    await finalizarLote(telegram, chatId, params[0]);
  } else if (acao === "lote_rm") {
    await removerMatch(telegram, chatId, params[0], Number(params[1]), messageId);
  } else if (acao === "lote_canc") {
    await cancelarLote(telegram, chatId, params[0]);
  } else if (acao === "rv_res") {
    await resolverRevisao(telegram, chatId, params, messageId);
  } else if (acao === "rv_cor") {
    await corrigirRevisao(telegram, chatId, params);
  } else if (acao === "rv_ign") {
    await ignorarRevisao(telegram, chatId, params, messageId);
  } else if (acao === "rv_sug") {
    await sugerirProduto(telegram, chatId, params, messageId);
  } else if (acao === "rv_dup") {
    await aceitarDuplicata(telegram, chatId, params, messageId);
  }
}

// Os handlers de revisão item-a-item (rv_res/rv_cor/rv_ign/rv_sug) atendem
// dois contextos: a fila global (/revisar, /adiados — item em filaRevisaoNotas)
// e a etapa 3 da navegação do lote (item dentro de lote.itens[]). O callback_data
// carrega o escopo ("fila" ou "lote") logo após a ação; esta função resolve o
// item e devolve as operações de mutação corretas para cada caso.
async function resolverContextoRevisao(params) {
  const [escopo, ...resto] = params;

  if (escopo === "fila") {
    const [itemId] = resto;
    const item = await buscarItemRevisaoPorId(itemId);
    const acionavel = item && (item.status === "pendente" || item.status === "ignorado");
    return {
      item,
      acionavel,
      async resolver(produtoId, { aceitarDuplicata = false } = {}) {
        const produtoDoc = await getFirestore().collection("catalogo").doc(produtoId).get();
        const nomeProduto = produtoDoc.data()?.nome;
        if (!aceitarDuplicata && await produtoJaTemRegistro({ produtoId, mercado: item.mercado, data: item.dataDaNota })) {
          return { nomeProduto, jaRegistrado: true };
        }
        if (!aceitarDuplicata) {
          const listaAtiva = await obterListaAtivaDoUsuario(item.uid);
          await registrarPreco({
            produtoId,
            mercado: item.mercado,
            preco: item.precoExtraido,
            data: item.dataDaNota,
            listaAtiva,
          });
        }
        await resolverItemRevisao(itemId, produtoId);
        return { nomeProduto };
      },
      async marcarAguardandoNome() {
        await marcarAguardandoNomeNovo(itemId);
      },
      async ignorar() {
        await ignorarItemRevisao(itemId);
      },
      async sugerirProduto() {
        const listaAtiva = await obterListaAtivaDoUsuario(item.uid);
        const { jaExistia } = await criarSugestaoDeProduto({
          nome: item.nomeExtraido,
          uid: item.uid,
          listaAtiva,
          preco: item.precoExtraido,
          mercado: item.mercado,
          data: item.dataDaNota,
        });
        await marcarItemComoSugerido(itemId);
        return { jaExistia };
      },
    };
  }

  // escopo === "lote"
  const [loteId, indiceStr] = resto;
  const indice = Number(indiceStr);
  const lote = await buscarLotePorId(loteId);
  const item = lote?.itens.find((i) => i.indice === indice);
  const acionavel = item && item.statusMatch === "sem_match" && !item.revisao?.status;

  return {
    item,
    acionavel,
    lote,
    async resolver(produtoId, { aceitarDuplicata = false } = {}) {
      const produtoDoc = await getFirestore().collection("catalogo").doc(produtoId).get();
      const nomeProduto = produtoDoc.data()?.nome;
      if (!aceitarDuplicata && await produtoJaTemRegistro({ produtoId, mercado: lote.mercado, data: lote.dataDaNota })) {
        return { nomeProduto, jaRegistrado: true };
      }
      if (!aceitarDuplicata) {
        const listaAtiva = await obterListaAtivaDoUsuario(lote.uid);
        await registrarPreco({
          produtoId,
          mercado: lote.mercado,
          preco: item.precoExtraido,
          data: lote.dataDaNota,
          listaAtiva,
        });
      }
      // duplicataAceita marca o item como já tratado sem que finalizarLote
      // grave o preço de novo (produtoIdResolvido normalmente significa
      // "grava na finalização" — aqui já foi decidido que não deve).
      await atualizarItemDoLote(loteId, indice, {
        revisao: {
          status: "resolvido",
          produtoIdResolvido: produtoId,
          aguardandoNomeNovo: false,
          duplicataAceita: aceitarDuplicata,
        },
      });
      return { nomeProduto };
    },
    async marcarAguardandoNome() {
      await atualizarItemDoLote(loteId, indice, {
        revisao: { status: null, produtoIdResolvido: null, aguardandoNomeNovo: true },
      });
    },
    async ignorar() {
      await atualizarItemDoLote(loteId, indice, {
        revisao: { status: "ignorado", produtoIdResolvido: null, aguardandoNomeNovo: false },
      });
    },
    async sugerirProduto() {
      const listaAtiva = await obterListaAtivaDoUsuario(lote.uid);
      const { jaExistia } = await criarSugestaoDeProduto({
        nome: item.nomeExtraido,
        uid: lote.uid,
        listaAtiva,
        preco: item.precoExtraido,
        mercado: lote.mercado,
        data: lote.dataDaNota,
      });
      await atualizarItemDoLote(loteId, indice, {
        revisao: { status: "resolvido", produtoIdResolvido: null, aguardandoNomeNovo: false },
      });
      return { jaExistia };
    },
  };
}

async function resolverRevisao(telegram, chatId, params, messageId) {
  const produtoId = params[params.length - 1];
  const escopoParams = params.slice(0, -1);
  const ctx = await resolverContextoRevisao(escopoParams);

  if (!ctx.acionavel) {
    await telegram.enviarMensagem(chatId, "Esse item já foi resolvido.");
    return;
  }

  const { nomeProduto, jaRegistrado } = await ctx.resolver(produtoId);
  const preco = `R$ ${ctx.item.precoExtraido.toFixed(2).replace(".", ",")}`;

  if (jaRegistrado) {
    // Não grava e não avança sozinho — o usuário decide: aceitar que é
    // duplicata mesmo (marca resolvido sem gravar de novo) ou escolher outra
    // opção na tela original (que continua intocada por baixo).
    await telegram.enviarMensagem(
      chatId,
      `⚠️ "${nomeProduto}" já tem preço registrado nesse mercado/data.`,
      { reply_markup: { inline_keyboard: [[
        { text: "✅ Aceitar (não gravar de novo)", callback_data: `rv_dup:${params.join(":")}` },
      ]] } }
    );
    return;
  }

  await telegram.enviarMensagem(chatId, `✅ Preço registrado! (${nomeProduto} — ${preco})`);
  await mostrarProximoAposAcao(telegram, chatId, escopoParams, ctx, messageId);
}

async function aceitarDuplicata(telegram, chatId, params, messageId) {
  const produtoId = params[params.length - 1];
  const escopoParams = params.slice(0, -1);
  const ctx = await resolverContextoRevisao(escopoParams);

  if (!ctx.acionavel) {
    await telegram.enviarMensagem(chatId, "Esse item já foi resolvido.");
    return;
  }

  const { nomeProduto } = await ctx.resolver(produtoId, { aceitarDuplicata: true });
  await telegram.enviarMensagem(chatId, `✅ Ok, "${nomeProduto}" fica como já registrado — não grava de novo.`);
  await mostrarProximoAposAcao(telegram, chatId, escopoParams, ctx, messageId);
}

async function corrigirRevisao(telegram, chatId, params) {
  const ctx = await resolverContextoRevisao(params);
  if (!ctx.acionavel) {
    await telegram.enviarMensagem(chatId, "Esse item já foi resolvido.");
    return;
  }
  await ctx.marcarAguardandoNome();
  await telegram.enviarMensagem(chatId, `Digite o nome correto para "${ctx.item.nomeExtraido}":`);
}

async function ignorarRevisao(telegram, chatId, params, messageId) {
  const ctx = await resolverContextoRevisao(params);
  if (!ctx.item) return;
  await ctx.ignorar();
  await telegram.enviarMensagem(
    chatId,
    params[0] === "fila" && ctx.item.status === "ignorado"
      ? "Continua adiado."
      : "Deixado para depois."
  );
  await mostrarProximoAposAcao(telegram, chatId, params, ctx, messageId);
}

async function sugerirProduto(telegram, chatId, params, messageId) {
  const ctx = await resolverContextoRevisao(params);
  if (!ctx.acionavel) {
    await telegram.enviarMensagem(chatId, "Esse item já foi resolvido.");
    return;
  }
  const { jaExistia } = await ctx.sugerirProduto();
  const mensagem = jaExistia
    ? `📨 "${ctx.item.nomeExtraido}" já tinha sido sugerido antes — aguardando aprovação de um admin. Assim que for aprovado, você pode registrar o preço de novo.`
    : `📨 "${ctx.item.nomeExtraido}" foi enviado como sugestão de produto novo — um admin vai revisar. Assim que for aprovado, você pode registrar o preço de novo.`;
  await telegram.enviarMensagem(chatId, mensagem);
  await mostrarProximoAposAcao(telegram, chatId, params, ctx, messageId);
}

async function mostrarProximoAposAcao(telegram, chatId, params, ctx, messageId) {
  if (params[0] === "fila") {
    await mostrarProximoDaMesmaLista(telegram, chatId, ctx.item, messageId);
    return;
  }
  const loteAtualizado = await buscarLotePorId(ctx.lote.id);
  await mostrarEtapa(telegram, chatId, loteAtualizado, messageId);
}

async function cancelarLote(telegram, chatId, loteId) {
  const lote = await buscarLotePorId(loteId);
  if (!lote || lote.status !== "aguardando_confirmacao") {
    await telegram.enviarMensagem(chatId, "Esse lote já não está mais pendente.");
    return;
  }
  await marcarLoteCancelado(loteId);
  await telegram.enviarMensagem(chatId, "Lote cancelado. Nada foi gravado. Pode mandar uma nova tabela.");
}

async function navegarEtapa(telegram, chatId, loteId, direcao, messageId) {
  const lote = await buscarLotePorId(loteId);
  if (!lote || lote.status !== "aguardando_confirmacao") {
    await telegram.enviarMensagem(chatId, "Esse lote já não está mais pendente.");
    return;
  }

  // Sair da etapa 2 pra frente sem remover (❌) um item jaRegistrado é a
  // confirmação implícita de que o match está certo e é mesmo duplicata —
  // descarta pra não ser gravado de novo (não vira pendente em /revisar).
  if ((lote.etapaAtual || 1) === 2 && direcao === 1) {
    for (const item of lote.itens) {
      if (item.statusMatch === "match" && item.jaRegistrado) {
        await atualizarItemDoLote(loteId, item.indice, { statusMatch: "descartado" });
      }
    }
  }

  const novaEtapa = Math.min(4, Math.max(1, (lote.etapaAtual || 1) + direcao));
  await definirEtapaDoLote(loteId, novaEtapa);
  const loteAtualizado = await buscarLotePorId(loteId);
  await mostrarEtapa(telegram, chatId, loteAtualizado, messageId);
}

async function removerMatch(telegram, chatId, loteId, indice, messageId) {
  // ❌ significa "esse match não está certo" — inclusive quando o item está
  // marcado jaRegistrado: pode ser falso positivo da detecção (mesmo
  // mercado/data, produto diferente), então cai no fluxo normal de revisão
  // (etapa 3) em vez de ser descartado direto. Confirmar a duplicata sem
  // clicar ❌ (avançando para a etapa 3) é o que descarta de vez — ver
  // navegarEtapa.
  await atualizarItemDoLote(loteId, indice, {
    statusMatch: "sem_match",
    produtoIdCasado: null,
    nomeProdutoCasado: null,
    jaRegistrado: false,
  });

  const loteAtualizado = await buscarLotePorId(loteId);
  await mostrarEtapa(telegram, chatId, loteAtualizado, messageId);
}

async function finalizarLote(telegram, chatId, loteId) {
  const lote = await buscarLotePorId(loteId);
  if (!lote || lote.status !== "aguardando_confirmacao") {
    await telegram.enviarMensagem(chatId, "Esse lote já não está mais pendente.");
    return;
  }

  const listaAtiva = await obterListaAtivaDoUsuario(lote.uid);

  let gravados = 0;
  let paraFila = 0;

  for (const item of lote.itens) {
    if (item.statusMatch === "descartado" || item.revisao?.duplicataAceita) {
      continue;
    } else if (item.statusMatch === "match" && item.confirmado) {
      await registrarPreco({
        produtoId: item.produtoIdCasado,
        mercado: lote.mercado,
        preco: item.precoExtraido,
        data: lote.dataDaNota,
        listaAtiva,
      });
      gravados++;
    } else if (item.revisao?.status === "resolvido" && item.revisao.produtoIdResolvido) {
      await registrarPreco({
        produtoId: item.revisao.produtoIdResolvido,
        mercado: lote.mercado,
        preco: item.precoExtraido,
        data: lote.dataDaNota,
        listaAtiva,
      });
      gravados++;
    } else {
      await adicionarNaFilaDeRevisao({
        loteId: lote.id,
        uid: lote.uid,
        chatId,
        nomeExtraido: item.nomeExpandido || item.nomeExtraido,
        precoExtraido: item.precoExtraido,
        unidade: item.unidade,
        mercado: lote.mercado,
        dataDaNota: lote.dataDaNota,
        status: item.revisao?.status === "ignorado" ? "ignorado" : "pendente",
      });
      paraFila++;
    }
  }

  await marcarLoteConfirmado(loteId);

  const mensagemFila = paraFila
    ? ` ${paraFila} ite${paraFila > 1 ? "ns" : "m"} foi${paraFila > 1 ? "ram" : ""} para a fila de revisão (mande /revisar para resolver).`
    : "";
  await telegram.enviarMensagem(
    chatId,
    `✅ ${gravados} preço${gravados > 1 ? "s" : ""} registrado${gravados > 1 ? "s" : ""} no QueQueFalta!${mensagemFila}`
  );
}
