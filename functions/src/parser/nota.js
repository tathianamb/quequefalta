// Formato do /nota (documentado em docs/template-nota.md):
//
//   Mercado: Max
//   Data: 21/11/2026
//   Total: 189,47
//   item; qtd; un; unit; desc; pago
//   ENERG BALY 473ML; 2; un; 5,99; 1,20; 10,78
//
// Cabeçalho "Chave: valor" em qualquer ordem (Mercado e Data obrigatórios,
// Total opcional). Itens com campos separados por ";" ou tab (colar do
// Sheets). A linha de títulos é opcional. desc vazio = 0; pago vazio =
// qtd × unit − desc; unit vazio = (pago + desc) ÷ qtd.
//
// Mensagem sem cabeçalho "Chave:" cai no formato antigo (parser/tabela.js),
// que continua aceito mas não é mais documentado.
import { interpretarTabela } from "./tabela.js";

export const TOLERANCIA_TOTAL = 0.05;

export const TEMPLATE_CURTO = [
  "/nota",
  "Mercado: Max",
  "Data: 21/11/2026",
  "Total: 43,77",
  "item; qtd; un; unit; desc; pago",
  "ENERG BALY 473ML; 2; un; 5,99; 1,20; 10,78",
  "FILEZINHO AURORA KG; 1,652; kg; 19,97; ; 32,99",
].join("\n");

const REGEX_CABECALHO = /^(mercado|loja|data|total)\s*:\s*(.*)$/i;
const MAX_LINHAS_IGNORADAS = 10;

const centavos = (n) => Math.round(n * 100) / 100;
const milesimos = (n) => Math.round(n * 1000) / 1000;

// "1.234,56" e "0,522" (vírgula decimal) ou "19.97" (ponto decimal).
// Vazio → null; texto que não é número → NaN.
export function lerNumero(texto) {
  const t = String(texto ?? "").trim().replace(/^R\$\s*/i, "");
  if (!t) return null;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return /^-?\d+(\.\d+)?$/.test(normal) ? parseFloat(normal) : NaN;
}

// dd/mm/aaaa, dd/mm/aa ou aaaa-mm-dd → "aaaa-mm-dd" (ou null se inválida).
export function lerData(texto) {
  const t = String(texto || "").trim();
  let dia, mes, ano;
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) [, dia, mes, ano] = m;
  else if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, ano, mes, dia] = m;
  else return null;
  if (ano.length === 2) ano = `20${ano}`;
  const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
  if (d.getFullYear() !== Number(ano) || d.getMonth() !== Number(mes) - 1 || d.getDate() !== Number(dia)) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function erroComTemplate(motivo) {
  return { erro: `${motivo}\n\nModelo:\n${TEMPLATE_CURTO}` };
}

// Uma linha de item → objeto, ou null se não der para ler.
function lerItem(linha) {
  const campos = linha.split(/\t|;/).map((c) => c.trim());
  if (campos.length < 4) return null;
  const [nome, qtdTexto, unTexto, unitTexto, descTexto = "", pagoTexto = ""] = campos;
  if (!nome) return null;

  const quantidade = lerNumero(qtdTexto);
  let preco = lerNumero(unitTexto);
  const desconto = lerNumero(descTexto) ?? 0;
  let total = lerNumero(pagoTexto);
  if (!Number.isFinite(quantidade) || quantidade <= 0) return null;
  if (Number.isNaN(preco) || Number.isNaN(desconto) || Number.isNaN(total)) return null;
  if (preco == null && total == null) return null;

  if (preco == null) preco = centavos((total + desconto) / quantidade);
  if (total == null) total = centavos(quantidade * preco - desconto);

  return {
    nome,
    quantidade: milesimos(quantidade),
    // Como no formato antigo: o QueQueFalta só distingue kg de unidade.
    unidade: unTexto.toLowerCase() === "kg" ? "kg" : "un",
    preco: centavos(preco),
    desconto: centavos(desconto),
    total: centavos(total),
  };
}

// Preço efetivo (pago ÷ qtd) só quando houve desconto.
function comPrecoPago(item) {
  const precoPago = item.desconto > 0 ? centavos(item.total / item.quantidade) : null;
  return { ...item, precoPago };
}

/**
 * @param {string} texto  o que veio depois de "/nota"
 * @returns {{ formato: "novo"|"antigo", mercado: string, data: string, totalNota: number|null,
 *   somaItens: number|null, linhasIgnoradas: string[],
 *   itens: Array<{ nome, quantidade, unidade, preco, desconto, total, precoPago }> } | { erro: string }}
 */
export function interpretarNota(texto) {
  const linhas = String(texto || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!linhas.some((l) => REGEX_CABECALHO.test(l))) {
    const antigo = interpretarTabela(texto);
    if (antigo.erro) return erroComTemplate(antigo.erro);
    const somaItens = antigo.itens.every((i) => Number.isFinite(i.total))
      ? centavos(antigo.itens.reduce((t, i) => t + i.total, 0))
      : null;
    return {
      formato: "antigo",
      mercado: antigo.mercado,
      data: antigo.data,
      totalNota: null,
      somaItens,
      linhasIgnoradas: [],
      itens: antigo.itens.map((i) => ({ ...i, desconto: null, precoPago: null })),
    };
  }

  let mercado = "";
  let dataTexto = "";
  let totalTexto = "";
  const itensPorNome = new Map();
  const linhasIgnoradas = [];
  let primeiraLinhaDeItem = true;

  for (const linha of linhas) {
    const cab = linha.match(REGEX_CABECALHO);
    if (cab) {
      const chave = cab[1].toLowerCase();
      if (chave === "mercado" || chave === "loja") mercado = cab[2].trim();
      else if (chave === "data") dataTexto = cab[2];
      else totalTexto = cab[2];
      continue;
    }
    // Linha de títulos ("item; qtd; un; ..."), opcional.
    if (primeiraLinhaDeItem && /^(item|produto|descri)/i.test(linha) && !/\d/.test(linha.split(/\t|;/)[1] || "")) {
      primeiraLinhaDeItem = false;
      continue;
    }
    primeiraLinhaDeItem = false;

    const item = lerItem(linha);
    if (!item) {
      linhasIgnoradas.push(linha);
      continue;
    }
    // O mesmo produto em duas linhas vira um item só: o preço é o da
    // primeira linha; quantidade, desconto e valor pago somam.
    const existente = itensPorNome.get(item.nome);
    if (!existente) itensPorNome.set(item.nome, item);
    else {
      existente.quantidade = milesimos(existente.quantidade + item.quantidade);
      existente.desconto = centavos(existente.desconto + item.desconto);
      existente.total = centavos(existente.total + item.total);
    }
  }

  if (!mercado) return erroComTemplate('Faltou a linha "Mercado: ...".');
  const data = lerData(dataTexto);
  if (!data) return erroComTemplate('Faltou a linha "Data: dd/mm/aaaa" (ou a data não existe).');
  const totalNota = totalTexto.trim() ? lerNumero(totalTexto) : null;
  if (Number.isNaN(totalNota)) return erroComTemplate('Não entendi o valor de "Total:".');

  const itens = [...itensPorNome.values()].map(comPrecoPago);
  if (!itens.length) {
    return erroComTemplate("Não encontrei nenhum item. Cada item vai numa linha: nome; qtd; un; unit; desc; pago.");
  }

  return {
    formato: "novo",
    mercado,
    data,
    totalNota,
    somaItens: centavos(itens.reduce((t, i) => t + i.total, 0)),
    linhasIgnoradas: linhasIgnoradas.slice(0, MAX_LINHAS_IGNORADAS),
    itens,
  };
}

// Aviso para o Resumo (etapa 1) quando a soma dos itens não bate com o total
// da nota — quase sempre erro de transcrição. null quando confere ou não há
// total para comparar.
export function avisoDeTotal({ totalNota, somaItens }) {
  if (totalNota == null || somaItens == null) return null;
  if (Math.abs(totalNota - somaItens) <= TOLERANCIA_TOTAL) return null;
  const br = (n) => n.toFixed(2).replace(".", ",");
  return `⚠️ Soma dos itens R$ ${br(somaItens)} ≠ total da nota R$ ${br(totalNota)}`;
}
