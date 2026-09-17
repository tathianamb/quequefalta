export function descreverItem(item) {
  const preco = `R$ ${item.precoExtraido.toFixed(2).replace(".", ",")}`;
  const nomeNota = item.nomeExpandido || item.nomeExtraido;
  if (item.statusMatch === "match") {
    return `${item.nomeProdutoCasado} (nota: "${nomeNota}") — ${preco}`;
  }
  return `${nomeNota} (sem match no catálogo) — ${preco}`;
}

export function formatarLinhaItem(item) {
  const prefixo = item.statusMatch === "match" ? "✅" : "⚠️";
  return `${prefixo} ${descreverItem(item)}`;
}
