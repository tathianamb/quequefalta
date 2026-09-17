export function formatarLinhaItem(item) {
  const preco = `R$ ${item.precoExtraido.toFixed(2).replace(".", ",")}`;
  if (item.statusMatch === "match") {
    return `✅ ${item.nomeProdutoCasado} — ${preco}`;
  }
  return `⚠️ ${item.nomeExpandido || item.nomeExtraido} (sem match no catálogo) — ${preco}`;
}
