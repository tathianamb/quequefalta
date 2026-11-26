import { descreverVariacao } from "../precos/variacao.js";
import { faltaMarca } from "../parser/marcaTamanho.js";

export function descreverItem(item) {
  const preco = `R$ ${item.precoExtraido.toFixed(2).replace(".", ",")}`;
  const nomeNota = item.nomeExtraido;
  if (item.statusMatch === "descartado") {
    return `${nomeNota} (descartado — já tinha preço registrado) — ${preco}`;
  }
  if (item.revisao?.sugestaoPendente) {
    return `${nomeNota} (vai virar sugestão de produto novo) — ${preco}`;
  }
  if (item.statusMatch === "match") {
    // 🧠 = casado pela memória de decisões anteriores, não pelo fuzzy match.
    const memoria = item.origemMatch === "apelido" ? "🧠 " : "";
    return `${memoria}${item.nomeProdutoCasado} (nota: "${nomeNota}") — ${preco}`;
  }
  return `${nomeNota} (sem match no catálogo) — ${preco}`;
}

// Texto curto da decisão tomada na etapa 3 sobre um item sem match — usado no
// botão "↩️" que desfaz essa decisão.
export function descreverRevisao(item) {
  const nomeNota = item.nomeExtraido;
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
  const variacao = descreverVariacao(item);
  return `${prefixo} ${descreverItem(item)}${variacao ? ` · ${variacao}` : ""}`;
}

// Itens que vão virar preço e não têm marca (a peso não conta).
export function contarSemMarca(lote) {
  return lote.itens.filter((i) => i.statusMatch !== "descartado" && faltaMarca(i)).length;
}

const LIMITE_TEXTO = 3800; // a mensagem do Telegram aceita até 4096 caracteres

// Pergunta do "🏷️ Marca e tamanho": todos os itens, numerados pela ordem da
// nota (o número é indice + 1, lido por lerRespostaMarcas).
export function textoPerguntaMarcas(lote) {
  const cabecalho = [
    "🏷️ Marca e tamanho",
    "",
    "Responda com uma linha por item que quiser mudar:",
    "número; marca; tamanho   (ex.: 3; Baly; 473 ml)",
    "Use - para sem marca. Item a peso não tem tamanho.",
    "",
    "",
  ].join("\n");
  let texto = cabecalho;
  for (const item of lote.itens) {
    const variacao = descreverVariacao(item);
    const falta = faltaMarca(item) ? "❔ " : "";
    const linha = `${item.indice + 1}. ${item.nomeExtraido} — ${falta}${variacao || (item.semMarca ? "sem marca" : "?")}\n`;
    if (texto.length + linha.length > LIMITE_TEXTO) {
      texto += "…";
      break;
    }
    texto += linha;
  }
  return texto.trimEnd();
}
