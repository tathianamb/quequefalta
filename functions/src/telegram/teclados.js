import { descreverItem } from "../comandos/resumoLote.js";

export function tecladoLotePendente(loteId) {
  return {
    inline_keyboard: [[{ text: "🗑️ Cancelar lote pendente", callback_data: `lote_canc:${loteId}` }]],
  };
}

function botoesNavegacao(loteId, etapa) {
  const linhas = [];
  if (etapa > 1) linhas.push([{ text: "⬅️ Anterior", callback_data: `lote_ant:${loteId}` }]);
  if (etapa < 4) linhas.push([{ text: "➡️ Próxima etapa", callback_data: `lote_prox:${loteId}` }]);
  linhas.push([{ text: "🗑️ Cancelar", callback_data: `lote_canc:${loteId}` }]);
  return linhas;
}

export function tecladoEtapa1(loteId) {
  return { inline_keyboard: botoesNavegacao(loteId, 1) };
}

export function tecladoEtapa2(loteId, itensComMatch) {
  const botoesRemover = itensComMatch.map((item) => [
    { text: `❌${item.jaRegistrado ? " ⚠️" : ""} ${descreverItem(item)}`, callback_data: `lote_rm:${loteId}:${item.indice}` },
  ]);
  return { inline_keyboard: [...botoesRemover, ...botoesNavegacao(loteId, 2)] };
}

export function tecladoEtapa3(loteId, itemAtual, sugestoes) {
  if (!itemAtual) return { inline_keyboard: botoesNavegacao(loteId, 3) };
  const tecladoItem = tecladoRevisaoItem(`lote:${loteId}:${itemAtual.indice}`, sugestoes);
  return { inline_keyboard: [...tecladoItem.inline_keyboard, ...botoesNavegacao(loteId, 3)] };
}

export function tecladoEtapa4(loteId) {
  return {
    inline_keyboard: [
      [{ text: "⬅️ Anterior", callback_data: `lote_ant:${loteId}` }],
      [{ text: "✅ Finalizar e gravar", callback_data: `lote_fin:${loteId}` }],
      [{ text: "🗑️ Cancelar", callback_data: `lote_canc:${loteId}` }],
    ],
  };
}

// `ref` já vem com o escopo embutido: "fila:{itemId}" (fila global, usada por
// /revisar e /adiados) ou "lote:{loteId}:{indice}" (etapa 3 da navegação do
// lote) — os handlers de callback despacham pra fonte de dados certa a partir
// desse prefixo. Nomes de ação abreviados (rv_*) para o callback_data caber
// no limite de 64 bytes do Telegram mesmo com dois IDs do Firestore (~20
// caracteres cada) no pior caso.
export function tecladoRevisaoItem(ref, sugestoes) {
  // No máximo 2 sugestões do catálogo — a 3ª vaga vai para "sugerir produto
  // novo", já que quando as 2 melhores opções não convencem, forçar uma
  // 3ª sugestão fraca tende a ser pior que oferecer cadastrar o produto.
  const botoesProdutos = sugestoes.slice(0, 2).map((s) => [
    { text: s.nome, callback_data: `rv_res:${ref}:${s.id}` },
  ]);
  return {
    inline_keyboard: [
      ...botoesProdutos,
      [{ text: "➕ Sugerir novo produto", callback_data: `rv_sug:${ref}` }],
      [{ text: "✏️ Corrigir nome", callback_data: `rv_cor:${ref}` }],
      [{ text: "⏭️ Deixar para depois", callback_data: `rv_ign:${ref}` }],
    ],
  };
}
