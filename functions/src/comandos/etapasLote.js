import { formatarLinhaItem } from "./resumoLote.js";
import { mostrarEtapa3 as mostrarEtapa3Revisao } from "./revisar.js";
import { tecladoEtapa1, tecladoEtapa2, tecladoEtapa4 } from "../telegram/teclados.js";
import { enviarOuEditar } from "../telegram/enviarOuEditar.js";

async function mostrarEtapa1(telegram, chatId, lote, messageId) {
  const resumo = lote.itens.map(formatarLinhaItem).join("\n");
  await enviarOuEditar(
    telegram,
    chatId,
    messageId,
    `Etapa 1/4 — Resumo\n\nMercado: ${lote.mercado}\n\n${resumo}`,
    { reply_markup: tecladoEtapa1(lote.id) }
  );
}

async function mostrarEtapa2(telegram, chatId, lote, messageId) {
  const itensComMatch = lote.itens.filter((i) => i.statusMatch === "match");
  const texto = itensComMatch.length
    ? "Etapa 2/4 — Revisão dos itens com match\n\nClique no item que está errado para tirá-lo do match automático (ele passa a contar como sem match):"
    : "Etapa 2/4 — Revisão dos itens com match\n\nNenhum item com match automático.";

  await enviarOuEditar(telegram, chatId, messageId, texto, { reply_markup: tecladoEtapa2(lote.id, itensComMatch) });
}

async function mostrarEtapa4(telegram, chatId, lote, messageId) {
  // Mesmo critério usado em finalizarLote (callback.js): "resolvido" só conta
  // como preço a gravar se já existe um produtoIdResolvido — um item enviado
  // como "sugerir novo produto" também fica com status "resolvido", mas sem
  // produtoIdResolvido (o produto ainda não existe), então vai para a fila.
  // Itens jaRegistrado nunca chegam aqui como "match" — sair da etapa 2 pra
  // frente já os descarta automaticamente (ver navegarEtapa em callback.js).
  // duplicataAceita é um "resolvido" que não deve gravar de novo — mesmo
  // critério de finalizarLote.
  const comMatch = lote.itens.filter((i) => i.statusMatch === "match");
  const resolvidos = lote.itens.filter((i) =>
    i.revisao?.status === "resolvido" && i.revisao.produtoIdResolvido && !i.revisao.duplicataAceita
  );
  const paraFilaOutros = lote.itens.filter((i) =>
    i.statusMatch !== "match" && i.statusMatch !== "descartado" && !i.revisao?.duplicataAceita &&
    !(i.revisao?.status === "resolvido" && i.revisao.produtoIdResolvido)
  );

  const gravados = comMatch.length + resolvidos.length;
  const paraFila = paraFilaOutros.length;

  const detalheFila = paraFila
    ? `\n${paraFila} ite${paraFila > 1 ? "ns" : "m"} sem match ${paraFila > 1 ? "vão" : "vai"} para a fila de revisão (mande /revisar depois).`
    : "";

  await enviarOuEditar(
    telegram,
    chatId,
    messageId,
    `Etapa 4/4 — Finalizar\n\n${gravados} preço${gravados > 1 ? "s" : ""} ser${gravados > 1 ? "ão" : "á"} registrado${gravados > 1 ? "s" : ""}.${detalheFila}\n\nConfirma?`,
    { reply_markup: tecladoEtapa4(lote.id) }
  );
}

export function mostrarEtapa(telegram, chatId, lote, messageId) {
  const passos = {
    1: mostrarEtapa1,
    2: mostrarEtapa2,
    3: mostrarEtapa3Revisao,
    4: mostrarEtapa4,
  };
  const passo = passos[lote.etapaAtual || 1];
  return passo(telegram, chatId, lote, messageId);
}
