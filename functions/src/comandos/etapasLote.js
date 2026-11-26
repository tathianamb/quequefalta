import { formatarLinhaItem, contarSemMarca } from "./resumoLote.js";
import { avisoDeTotal } from "../parser/nota.js";
import { mostrarEtapa3 as mostrarEtapa3Revisao } from "./revisar.js";
import { tecladoEtapa1, tecladoEtapa2, tecladoEtapa4 } from "../telegram/teclados.js";
import { enviarOuEditar } from "../telegram/enviarOuEditar.js";

async function mostrarEtapa1(telegram, chatId, lote, messageId, prefixo = "") {
  const resumo = lote.itens.map(formatarLinhaItem).join("\n");
  const br = (n) => n.toFixed(2).replace(".", ",");
  const [ano, mes, dia] = String(lote.dataDaNota || "").split("-");
  const cabecalho = [
    `Mercado: ${lote.mercado}`,
    lote.dataDaNota ? `Data: ${dia}/${mes}/${ano}` : null,
    lote.totalNota != null ? `Total da nota: R$ ${br(lote.totalNota)}` : null,
  ].filter(Boolean).join("\n");
  // Conferência da transcrição: soma ≠ total e linhas que o parser não leu.
  const avisos = [
    avisoDeTotal(lote),
    lote.linhasIgnoradas?.length
      ? `⚠️ ${lote.linhasIgnoradas.length} linha(s) não entendida(s), ficaram de fora:\n${lote.linhasIgnoradas.map((l) => `   ${l}`).join("\n")}`
      : null,
  ].filter(Boolean);
  const textoAvisos = avisos.length ? `\n\n${avisos.join("\n\n")}` : "";
  await enviarOuEditar(
    telegram,
    chatId,
    messageId,
    `${prefixo}Etapa 1/4 — Resumo\n\n${cabecalho}\n\n${resumo}${textoAvisos}${textoSemMarca(lote)}`,
    { reply_markup: tecladoEtapa1(lote.id) }
  );
}

function textoSemMarca(lote) {
  const n = contarSemMarca(lote);
  return n ? `\n\n🏷️ ${n} ite${n > 1 ? "ns" : "m"} sem marca. Para completar marca e tamanho, toque em 🏷️.` : "";
}

async function mostrarEtapa2(telegram, chatId, lote, messageId, prefixo = "") {
  const itensComMatch = lote.itens.filter((i) => i.statusMatch === "match");
  const texto = itensComMatch.length
    ? "Etapa 2/4 — Revisão dos itens com match\n\nClique no item que está errado para tirá-lo do match automático (ele passa a contar como sem match):"
    : "Etapa 2/4 — Revisão dos itens com match\n\nNenhum item com match automático.";

  await enviarOuEditar(telegram, chatId, messageId, `${prefixo}${texto}`, { reply_markup: tecladoEtapa2(lote.id, itensComMatch) });
}

async function mostrarEtapa4(telegram, chatId, lote, messageId, prefixo = "") {
  // Mesmo critério usado em finalizarLote (callback.js): "resolvido" só conta
  // como preço a gravar se já existe um produtoIdResolvido — sugestaoPendente
  // é o item marcado "sugerir novo produto" na etapa 3, que só vira uma
  // sugestão de verdade ao confirmar aqui (não grava preço, não vai pra fila).
  // Itens jaRegistrado nunca chegam aqui como "match" — sair da etapa 2 pra
  // frente já os descarta automaticamente (ver navegarEtapa em callback.js).
  // duplicataAceita é um "resolvido" que não deve gravar de novo — mesmo
  // critério de finalizarLote.
  const comMatch = lote.itens.filter((i) => i.statusMatch === "match");
  const resolvidos = lote.itens.filter((i) =>
    i.revisao?.status === "resolvido" && i.revisao.produtoIdResolvido && !i.revisao.duplicataAceita
  );
  const sugestoesPendentes = lote.itens.filter((i) => i.revisao?.sugestaoPendente);
  const paraFilaOutros = lote.itens.filter((i) =>
    i.statusMatch !== "match" && i.statusMatch !== "descartado" && !i.revisao?.duplicataAceita &&
    !i.revisao?.sugestaoPendente &&
    !(i.revisao?.status === "resolvido" && i.revisao.produtoIdResolvido)
  );

  const gravados = comMatch.length + resolvidos.length;
  const sugeridos = sugestoesPendentes.length;
  const paraFila = paraFilaOutros.length;

  const detalheSugeridos = sugeridos
    ? `\n${sugeridos} ite${sugeridos > 1 ? "ns" : "m"} ${sugeridos > 1 ? "vão" : "vai"} como sugestão de produto novo.`
    : "";
  const detalheFila = paraFila
    ? `\n${paraFila} ite${paraFila > 1 ? "ns" : "m"} sem match ${paraFila > 1 ? "vão" : "vai"} para a fila de revisão (mande /revisar depois).`
    : "";
  const fraseGravados = gravados === 0
    ? "Nenhum preço será registrado."
    : `${gravados} preço${gravados > 1 ? "s" : ""} ser${gravados > 1 ? "ão" : "á"} registrado${gravados > 1 ? "s" : ""}.`;

  await enviarOuEditar(
    telegram,
    chatId,
    messageId,
    `${prefixo}Etapa 4/4 — Finalizar\n\n${fraseGravados}${detalheSugeridos}${detalheFila}${textoSemMarca(lote)}\n\nConfirma?`,
    { reply_markup: tecladoEtapa4(lote.id) }
  );
}

// `prefixo` antepõe uma confirmação pontual (ex: "✅ Preço registrado! (...)")
// ao texto da etapa, em vez de mandá-la como mensagem separada — reduz o
// histórico quando várias correções acontecem em sequência (uma nota com
// muitos itens sem match podia virar dezenas de mensagens novas).
export function mostrarEtapa(telegram, chatId, lote, messageId, prefixo = "") {
  const passos = {
    1: mostrarEtapa1,
    2: mostrarEtapa2,
    3: mostrarEtapa3Revisao,
    4: mostrarEtapa4,
  };
  const passo = passos[lote.etapaAtual || 1];
  return passo(telegram, chatId, lote, messageId, prefixo);
}
