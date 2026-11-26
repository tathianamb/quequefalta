// Regras de preço compartilhadas pela lista ("onde comprar"), pelo detalhe do
// produto e pelas sugestões do mês. Tudo sai do `historico` de cada produto.
// Mercado, marca e tamanho seguem functions/src/precos/variacao.js, o mesmo
// arquivo que o bot do Telegram usa (sem dependências, roda nos dois lados).

import {
  chaveMercado,
  chaveMarca,
  mercadoCanonico,
  precoPorMedida,
  substitui,
  formatarTamanho,
} from "../../functions/src/precos/variacao.js";

export {
  chaveMercado,
  chaveMarca,
  mercadoCanonico,
  precoPorMedida,
  formatarTamanho,
  descreverVariacao,
  lerTamanho,
  limparMarca,
  jaRegistrado,
  camposDaVariacao,
} from "../../functions/src/precos/variacao.js";

const DIA_MS = 24 * 60 * 60 * 1000;

// Preço com mais de 4 meses só vale se não houver nada mais novo: o preço
// de um mercado que não é visitado há muito tempo não diz muito hoje.
const VALIDADE_PRECO_DIAS = 120;

export function dataDoRegistro(h) {
  const d = h?.data?.toDate ? h.data.toDate() : h?.data ? new Date(h.data) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

export function formatarPreco(valor) {
  return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;
}

// { valor, por } → "R$ 15,90/kg"
export function formatarPrecoPorMedida(p) {
  return p ? `${formatarPreco(p.valor)}/${p.por}` : "";
}

/**
 * "R$ 2,39 · Bulnez 1,5 L (R$ 1,59/L)", "R$ 19,97/kg · Aurora", "R$ 5,99".
 * Serve para um registro do historico ou um item de precosAtuais.
 */
export function descreverPreco(p) {
  if (!p) return "";
  if (p.unidade === "kg") return [`${formatarPreco(p.preco)}/kg`, p.marca].filter(Boolean).join(" · ");
  const porMedida = p.porMedida ?? precoPorMedida(p);
  const mostrarPorMedida = porMedida && !(porMedida.por === "un" && p.tamanho === 1);
  const variacao = [p.marca, formatarTamanho(p)].filter(Boolean).join(" ");
  const detalhe = variacao + (mostrarPorMedida ? ` (${formatarPrecoPorMedida(porMedida)})` : "");
  return [formatarPreco(p.preco), detalhe].filter(Boolean).join(" · ");
}

/**
 * Preços atuais: em cada mercado, o registro MAIS RECENTE de cada variação
 * (marca + tamanho), e não o menor de todos (que pode ser uma promoção
 * antiga). Um registro substitui os mais velhos que ele não contradiz
 * (substitui(), em variacao.js): sem marca nem tamanho, vale só o mais
 * recente do mercado.
 * @returns {Array<{ mercado, chave, preco, data, marca, tamanho, medida, unidade, porMedida }>}
 */
export function precosAtuais(historico = []) {
  const validos = historico
    .map((h) => ({ h, data: dataDoRegistro(h) }))
    .filter(({ h, data }) => h?.mercado && typeof h.preco === "number" && data)
    .sort((a, b) => b.data - a.data);
  const atuais = [];
  for (const { h, data } of validos) {
    const chave = chaveMercado(h.mercado);
    if (atuais.some((a) => a.chave === chave && substitui(a.h, h))) continue;
    atuais.push({ h, chave, data });
  }
  return atuais.map(({ h, chave, data }) => ({
    mercado: mercadoCanonico(h.mercado),
    chave,
    preco: h.preco,
    data,
    marca: h.marca ?? null,
    tamanho: h.tamanho ?? null,
    medida: h.medida ?? null,
    unidade: h.unidade ?? null,
    porMedida: precoPorMedida(h),
  }));
}

// Compara por kg/L/unidade quando todos os candidatos têm tamanho na mesma
// medida (embalagens diferentes); senão, pelo preço, como antes.
function maisBarato(candidatos) {
  const medidas = new Set(candidatos.map((p) => p.porMedida?.por));
  const porMedida = medidas.size === 1 && !medidas.has(undefined);
  const valor = (p) => (porMedida ? p.porMedida.valor : p.preco);
  return candidatos.reduce((melhor, p) => (valor(p) < valor(melhor) ? p : melhor));
}

/**
 * Onde comprar um produto: o preço atual mais barato, entre os que têm preço
 * dos últimos VALIDADE_PRECO_DIAS (ou entre todos, se nenhum tiver). Com marca
 * preferida, só os preços dela contam (se houver algum).
 * @returns {{ mercado, chave, preco, data, marca, tamanho, medida, unidade, porMedida } | null}
 */
export function ondeComprar(produto, hoje = new Date()) {
  const precos = precosAtuais(produto?.historico);
  if (!precos.length) return null;
  const limite = hoje.getTime() - VALIDADE_PRECO_DIAS * DIA_MS;
  const recentes = precos.filter((p) => p.data.getTime() >= limite);
  let candidatos = recentes.length ? recentes : precos;
  const preferida = chaveMarca(produto?.marcaPreferida);
  if (preferida) {
    const daMarca = candidatos.filter((p) => chaveMarca(p.marca) === preferida);
    if (daMarca.length) candidatos = daMarca;
  }
  return maisBarato(candidatos);
}

// Preços atuais em ordem: os recentes primeiro e, entre eles, o mais barato
// (por kg/L quando dá para comparar). Para a lista do detalhe do produto.
export function precosAtuaisOrdenados(produto, hoje = new Date()) {
  const precos = precosAtuais(produto?.historico);
  const limite = hoje.getTime() - VALIDADE_PRECO_DIAS * DIA_MS;
  const medidas = new Set(precos.map((p) => p.porMedida?.por));
  const porMedida = medidas.size === 1 && !medidas.has(undefined);
  const valor = (p) => (porMedida ? p.porMedida.valor : p.preco);
  const antigo = (p) => p.data.getTime() < limite;
  return precos.sort((a, b) => antigo(a) - antigo(b) || valor(a) - valor(b));
}
