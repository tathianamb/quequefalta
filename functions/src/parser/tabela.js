const REGEX_CABECALHO = /^(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*$/;

// Casa o final de uma linha de item: <nome> <qtd>(,|.) (UN|kg|FR|CX|PCT|...) <preço unit.> <total>
// separados por tab OU um ou mais espaços — cobre tanto colar direto do
// Excel/Sheets (tab) quanto texto encaminhado de outra conversa (só espaço).
// Qualquer sigla de 2-4 letras que não seja "kg" é tratada como unidade "un"
// (frasco, caixa, pacote etc — o QueQueFalta só distingue un/kg).
const REGEX_LINHA_ITEM = /^(.+?)[\t ]+([\d.,]+)\s*([a-z]{2,4})[\t ]+([\d.,]+)[\t ]+([\d.,]+)\s*$/i;

function paraNumero(valorBr) {
  return parseFloat(valorBr.replace(/\./g, "").replace(",", "."));
}

function paraDataIso(dataBr) {
  const [dia, mes, ano] = dataBr.split("/");
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

/**
 * Interpreta uma mensagem com uma tabela de compras (colada do Excel/Sheets
 * com tab, ou encaminhada de outra conversa com espaços simples), no formato:
 *   <Mercado> <data dd/mm/aaaa>
 *   [linha de cabeçalho da tabela, ignorada]
 *   <nome> <qtd un/kg> <preço unitário> <total>
 *   ...
 *
 * @param {string} texto
 * @returns {{ mercado: string, data: string, itens: Array<{nome, preco, unidade}> } | { erro: string }}
 */
export function interpretarTabela(texto) {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (linhas.length < 2) {
    return { erro: "Mensagem muito curta. Preciso do mercado+data na primeira linha e ao menos um item." };
  }

  const matchCabecalho = linhas[0].match(REGEX_CABECALHO);
  if (!matchCabecalho) {
    return {
      erro: 'Não entendi a primeira linha. Use o formato "Nome do Mercado dd/mm/aaaa" (ex: "Max Muffato 31/08/2026").',
    };
  }
  const [, mercado, dataBr] = matchCabecalho;

  const itensPorNome = new Map();

  for (const linha of linhas.slice(1)) {
    const matchItem = linha.match(REGEX_LINHA_ITEM);
    if (!matchItem) continue;

    const [, nome, , unidadeTexto, precoUnitTexto] = matchItem;
    const nomeLimpo = nome.trim();
    if (!nomeLimpo || /^produto\b/i.test(nomeLimpo)) continue; // pula linha de cabeçalho da tabela

    const unidade = unidadeTexto.toLowerCase() === "kg" ? "kg" : "un";
    const preco = paraNumero(precoUnitTexto);
    if (Number.isNaN(preco)) continue;

    if (!itensPorNome.has(nomeLimpo)) {
      itensPorNome.set(nomeLimpo, { nome: nomeLimpo, preco, unidade });
    }
  }

  if (itensPorNome.size === 0) {
    return {
      erro: "Não encontrei nenhum item válido na tabela. Cada linha deve ter: nome, quantidade (ex: 1 UN ou 0,522 kg), preço unitário e total.",
    };
  }

  return {
    mercado: mercado.trim(),
    data: paraDataIso(dataBr),
    itens: [...itensPorNome.values()],
  };
}
