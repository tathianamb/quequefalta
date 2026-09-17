export function descreverItem(item) {
  const preco = `R$ ${item.precoExtraido.toFixed(2).replace(".", ",")}`;
  const nomeNota = item.nomeExpandido || item.nomeExtraido;
  if (item.statusMatch === "descartado") {
    return `${nomeNota} (descartado — já tinha preço registrado) — ${preco}`;
  }
  const avisoDuplicado = item.jaRegistrado ? " ⚠️ já tem preço registrado nesse mercado/data" : "";
  if (item.statusMatch === "match") {
    return `${item.nomeProdutoCasado} (nota: "${nomeNota}") — ${preco}${avisoDuplicado}`;
  }
  return `${nomeNota} (sem match no catálogo) — ${preco}`;
}

export function formatarLinhaItem(item) {
  const prefixo = item.statusMatch === "descartado" ? "🗑️" : item.statusMatch === "match" ? "✅" : "⚠️";
  return `${prefixo} ${descreverItem(item)}`;
}
