// Marca e tamanho de cada item de uma nota (bot). A ordem de quem manda:
//   1. as colunas `marca` e `tam` da própria nota (quem transcreveu sabe);
//   2. a memória daquele nome de nota (apelidosNota), que guarda a última
//      correção feita no bot;
//   3. o que dá para tirar do nome: tamanho escrito ("473ML") e uma marca já
//      conhecida no catálogo que apareça inteira no nome.
// Item vendido a peso (unidade "kg") não tem tamanho: o preço já é por kg.
import { normalizar } from "../matching/fuzzyMatch.js";
import { extrairTamanho, lerTamanho, limparMarca, ehSemMarca } from "../precos/variacao.js";

/** A marca conhecida mais longa que aparece inteira no nome, ou null. */
export function marcaNoNome(nome, marcasConhecidas = []) {
  const texto = ` ${normalizar(nome || "")} `;
  let melhor = null;
  for (const marca of marcasConhecidas) {
    const chave = normalizar(marca);
    if (chave.length < 3 || !texto.includes(` ${chave} `)) continue;
    if (!melhor || chave.length > normalizar(melhor).length) melhor = marca;
  }
  return melhor;
}

/**
 * @param {{ nome, unidade, marca?, semMarca?, tamanho?, medida? }} item  como sai do parser
 * @param {{ apelido?: object|null, marcasConhecidas?: string[] }} contexto
 * @returns o item com marca, semMarca, tamanho e medida preenchidos (null quando não se sabe)
 */
export function completarMarcaETamanho(item, { apelido = null, marcasConhecidas = [] } = {}) {
  let marca = item.marca || null;
  let semMarca = Boolean(item.semMarca) && !marca;
  if (!marca && !semMarca) {
    if (apelido?.marca) marca = apelido.marca;
    else if (apelido?.semMarca) semMarca = true;
    else marca = marcaNoNome(item.nome, marcasConhecidas);
  }

  let tamanho = null;
  let medida = null;
  if (item.unidade !== "kg") {
    const achado =
      (item.tamanho > 0 && { tamanho: item.tamanho, medida: item.medida }) ||
      (apelido?.tamanho > 0 && { tamanho: apelido.tamanho, medida: apelido.medida }) ||
      extrairTamanho(item.nome);
    if (achado) ({ tamanho, medida } = achado);
  }
  return { ...item, marca, semMarca, tamanho, medida };
}

/** Falta marca? (a peso não conta: carne e fruta raramente têm marca). */
export function faltaMarca(item) {
  return !item.marca && !item.semMarca && item.unidade !== "kg";
}

// Tamanho no fim de um texto sem ";" ("Baly 473 ml" → marca "Baly").
const RE_TAMANHO_NO_FIM = /(?:^|\s)((?:\d{1,3}\s*x\s*)?\d+(?:[.,]\d+)*\s*[a-z]+)\.?\s*$/i;

/**
 * Lê a resposta ao "🏷️ Marca e tamanho": uma linha por item,
 * `número; marca; tamanho` (ex.: "3; Baly; 473 ml"). Sem ";" também vale:
 * "3 Baly 473 ml". "-" na marca = sem marca; "-" no tamanho = apaga o tamanho;
 * campo vazio = não mexe.
 * @param {string} texto
 * @param {number} totalItens  os números válidos vão de 1 a totalItens
 * @returns {{ mudancas: Array<{ indice, marca?, semMarca?, tamanho?, medida? }>, naoEntendidas: string[] }}
 */
export function lerRespostaMarcas(texto, totalItens) {
  const mudancas = [];
  const naoEntendidas = [];
  for (const linha of String(texto || "").split("\n").map((l) => l.trim()).filter(Boolean)) {
    // O separador vem colado ao número ("3;", "3.", "3)"); "3 -" é sem marca.
    const m = linha.match(/^(\d{1,3})[;.):]?\s*(.*)$/);
    const numero = m && Number(m[1]);
    if (!m || numero < 1 || numero > totalItens || !m[2].trim()) {
      naoEntendidas.push(linha);
      continue;
    }
    let marcaTexto;
    let tamanhoTexto = "";
    if (m[2].includes(";")) {
      [marcaTexto, tamanhoTexto = ""] = m[2].split(";").map((c) => c.trim());
    } else {
      const fim = m[2].match(RE_TAMANHO_NO_FIM);
      if (fim && lerTamanho(fim[1])) {
        tamanhoTexto = fim[1];
        marcaTexto = m[2].slice(0, fim.index).trim();
      } else {
        marcaTexto = m[2].trim();
      }
    }

    const mudanca = { indice: numero - 1 };
    if (ehSemMarca(marcaTexto)) Object.assign(mudanca, { marca: null, semMarca: true });
    else if (marcaTexto) Object.assign(mudanca, { marca: limparMarca(marcaTexto), semMarca: false });

    if (ehSemMarca(tamanhoTexto)) Object.assign(mudanca, { tamanho: null, medida: null });
    else if (tamanhoTexto) {
      const tamanho = lerTamanho(tamanhoTexto);
      if (!tamanho) {
        naoEntendidas.push(linha);
        continue;
      }
      Object.assign(mudanca, tamanho);
    }
    mudancas.push(mudanca);
  }
  return { mudancas, naoEntendidas };
}
