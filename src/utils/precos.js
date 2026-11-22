// Regras de preço compartilhadas pela lista ("onde comprar") e pelas
// sugestões do mês. Tudo sai do `historico` de cada produto do catálogo.

import { normalizar } from "./texto";

const DIA_MS = 24 * 60 * 60 * 1000;

// Preço com mais de 4 meses só vale se não houver nada mais novo: o preço
// de um mercado que não é visitado há muito tempo não diz muito hoje.
const VALIDADE_PRECO_DIAS = 120;

export function dataDoRegistro(h) {
  const d = h?.data?.toDate ? h.data.toDate() : h?.data ? new Date(h.data) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

// "Atacadão", "atacadao " e "ATACADÃO" são o mesmo mercado.
export function chaveMercado(nome) {
  return normalizar(nome);
}

export function formatarPreco(valor) {
  return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;
}

/**
 * Preço atual em cada mercado = o registro MAIS RECENTE daquele mercado
 * (não o menor de todos, que pode ser uma promoção antiga).
 * @returns {Array<{ mercado, chave, preco, data }>}
 */
export function precosAtuaisPorMercado(historico = []) {
  const porMercado = new Map();
  for (const h of historico) {
    const data = dataDoRegistro(h);
    if (!h?.mercado || typeof h.preco !== "number" || !data) continue;
    const chave = chaveMercado(h.mercado);
    const atual = porMercado.get(chave);
    if (!atual || data > atual.data) {
      porMercado.set(chave, { mercado: h.mercado.trim(), chave, preco: h.preco, data });
    }
  }
  return [...porMercado.values()];
}

/**
 * Onde comprar um produto: o mercado com o menor preço atual, entre os que
 * têm preço dos últimos VALIDADE_PRECO_DIAS (ou entre todos, se nenhum tiver).
 * @returns {{ mercado, chave, preco, data } | null}
 */
export function ondeComprar(produto, hoje = new Date()) {
  const precos = precosAtuaisPorMercado(produto?.historico);
  if (!precos.length) return null;
  const limite = hoje.getTime() - VALIDADE_PRECO_DIAS * DIA_MS;
  const recentes = precos.filter((p) => p.data.getTime() >= limite);
  const candidatos = recentes.length ? recentes : precos;
  return candidatos.reduce((melhor, p) => (p.preco < melhor.preco ? p : melhor));
}
