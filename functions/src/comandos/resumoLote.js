export function descreverItem(item) {
  const preco = `R$ ${item.precoExtraido.toFixed(2).replace(".", ",")}`;
  const nomeNota = item.nomeExpandido || item.nomeExtraido;
  if (item.statusMatch === "descartado") {
    return `${nomeNota} (descartado — já tinha preço registrado) — ${preco}`;
  }
  if (item.revisao?.sugestaoPendente) {
    return `${nomeNota} (vai virar sugestão de produto novo) — ${preco}`;
  }
  if (item.statusMatch === "match") {
    return `${item.nomeProdutoCasado} (nota: "${nomeNota}") — ${preco}`;
  }
  return `${nomeNota} (sem match no catálogo) — ${preco}`;
}

// Texto curto da decisão tomada na etapa 3 sobre um item sem match — usado no
// botão "↩️" que desfaz essa decisão.
export function descreverRevisao(item) {
  const nomeNota = item.nomeExpandido || item.nomeExtraido;
  const r = item.revisao || {};
  if (r.sugestaoPendente) return `${nomeNota} (sugestão de produto novo)`;
  if (r.status === "ignorado") return `${nomeNota} (deixado para depois)`;
  const destino = r.nomeProdutoResolvido || "produto escolhido";
  return r.duplicataAceita
    ? `${nomeNota} → ${destino} (já tinha preço)`
    : `${nomeNota} → ${destino}`;
}

export function formatarLinhaItem(item) {
  const prefixo =
    item.statusMatch === "descartado" ? "🗑️" :
    item.revisao?.sugestaoPendente ? "📨" :
    item.statusMatch === "match" && item.jaRegistrado ? "⚠️" :
    item.statusMatch === "match" ? "✅" :
    "❌";
  return `${prefixo} ${descreverItem(item)}`;
}
