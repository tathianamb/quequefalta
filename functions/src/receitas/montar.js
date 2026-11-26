// "Comi X" → receita pendente (registrarComida, receitaNutreai.js). Funções
// puras: o prompt do Gemini, a leitura da resposta e a conversão para o
// formato de receita do app (src/components/receitas/ReceitaFormulario.jsx).

const simplificar = (t) =>
  String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Mesmas unidades e apelidos do formulário de receita do app
// (ReceitaFormulario.jsx): ao mudar lá, mude aqui.
export const UNIDADES = ["", "un.", "g", "kg", "mL", "L", "xíc.", "cl. sopa", "cl. chá", "cl. café", "pitada", "lata", "pacote", "dente", "fatia", "ramo"];
const ALIAS_UNIDADE = {
  xicara: "xíc.", xicaras: "xíc.", "xícara": "xíc.", "xícaras": "xíc.", xic: "xíc.", "xíc": "xíc.",
  ml: "mL", mililitro: "mL", mililitros: "mL", l: "L", litro: "L", litros: "L",
  grama: "g", gramas: "g", quilo: "kg", quilos: "kg", quilograma: "kg",
  "colher de sopa": "cl. sopa", "colheres de sopa": "cl. sopa", "colher de chá": "cl. chá", "colheres de chá": "cl. chá",
  "colher de café": "cl. café", "colheres de café": "cl. café",
  unidade: "un.", unidades: "un.", und: "un.", un: "un.",
  pitadas: "pitada", latas: "lata", pacotes: "pacote", dentes: "dente", fatias: "fatia", ramos: "ramo",
};

export function normalizarUnidade(valor) {
  if (!valor) return "";
  const v = String(valor).toLowerCase().trim();
  return ALIAS_UNIDADE[v] ?? (UNIDADES.includes(valor) ? valor : "");
}

// Quantidade como o formulário aceita: "200", "1,5", "1/2", "1 1/2", "½".
const FRACOES = { "¼": "1/4", "½": "1/2", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8" };
const RE_QTD = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)$/;
export function normalizarQuantidade(valor) {
  if (valor == null || valor === "") return null;
  let s = String(valor).trim();
  for (const [f, r] of Object.entries(FRACOES)) s = s.split(f).join(` ${r}`).trim();
  s = s.replace(/\s+/g, " ");
  return RE_QTD.test(s) ? s.replace(",", ".") : null;
}

export const LIMITES = { nome: 120, ingredientes: 40, passos: 30, passo: 1000, observacao: 200 };

/**
 * @param {{ prato: string, receitas: Array<{id, nome}>, catalogo: Array<{nome}> }} args
 */
export function montarPromptReceita({ prato, receitas, catalogo }) {
  return [
    "Você ajuda o app QueQueFalta, de lista de compras e receitas de uma casa no Brasil.",
    `Alguém da casa contou: "comi ${prato}".`,
    "",
    "1. Se esse prato for uma das receitas que já existem no app (lista abaixo, \"id | nome\"), mesmo com outro nome, responda só:",
    '   {"tipo":"existente","id":"<id>"}',
    "2. Se não for um prato com preparo (uma fruta, um alimento pronto, pão com manteiga), responda só:",
    '   {"tipo":"nao_e_receita"}',
    "3. Senão, pesquise na web uma receita caseira real desse prato e responda:",
    '   {"tipo":"nova","receita":{"nome":"...","porcoes":4,"tempoPreparo":40,',
    '    "ingredientes":[{"produto":"<nome EXATO da lista do catálogo, ou null>","nome":"...","quantidade":"200","unidade":"g","observacao":"..."}],',
    '    "passos":["...","..."]}}',
    "",
    "Regras da receita nova:",
    "- Português do Brasil. Nome curto e genérico do prato, com inicial maiúscula.",
    "- Tire do nome qualquer pessoa, apelido, lugar ou detalhe pessoal (\"costelinha barbecue que o G fez\" vira \"Costelinha barbecue\").",
    "- Nada de restrição alimentar, dieta, doença ou dado de saúde em nenhum campo.",
    "- \"produto\": o produto do catálogo que se compra para esse ingrediente, escrito exatamente como na lista. Prefira o genérico quando existir (\"Óleo\", \"Sal\"). Sem produto parecido, use null.",
    `- "unidade": uma destas: ${UNIDADES.filter(Boolean).join(", ")}, ou "" (a gosto).`,
    "- \"quantidade\": texto como \"200\", \"1/2\" ou \"1 1/2\"; vazio quando for a gosto.",
    `- No máximo ${LIMITES.ingredientes} ingredientes e ${LIMITES.passos} passos curtos. Tempo em minutos.`,
    "",
    "Responda só com o JSON, sem comentários.",
    "",
    "Receitas que já existem (id | nome):",
    ...(receitas.length ? receitas.map((r) => `${r.id} | ${r.nome}`) : ["(nenhuma)"]),
    "",
    "Catálogo de produtos (um por linha):",
    ...catalogo.map((p) => p.nome),
  ].join("\n");
}

/** Tira o JSON da resposta do Gemini (com ou sem bloco ```json). null se não der. */
export function lerRespostaReceita(texto) {
  const bloco = String(texto || "").match(/```(?:json)?\s*([\s\S]*?)```/);
  const bruto = bloco ? bloco[1] : String(texto || "");
  const inicio = bruto.indexOf("{");
  const fim = bruto.lastIndexOf("}");
  if (inicio < 0 || fim < inicio) return null;
  try {
    const obj = JSON.parse(bruto.slice(inicio, fim + 1));
    return obj && typeof obj === "object" && typeof obj.tipo === "string" ? obj : null;
  } catch {
    return null;
  }
}

const texto = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const inteiro = (v, min, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/**
 * Converte a receita do Gemini para o formato do app. Ingrediente casado com
 * o catálogo leva produtoId (e o nome do produto); o resto vira nomeTemp
 * ("sem cadastro"), que o app obriga a resolver antes de aprovar.
 * @returns {{ receita, semCadastro: string[] } | null}  null se faltar nome, ingrediente ou passo
 */
export function montarReceita(bruta, catalogo) {
  const porNome = new Map(catalogo.map((p) => [simplificar(p.nome), p]));
  const nome = texto(bruta?.nome, LIMITES.nome);
  const ingredientes = [];
  const semCadastro = [];
  for (const ing of (Array.isArray(bruta?.ingredientes) ? bruta.ingredientes : []).slice(0, LIMITES.ingredientes)) {
    const nomeIng = texto(ing?.nome, LIMITES.nome) || texto(ing?.produto, LIMITES.nome);
    if (!nomeIng) continue;
    const produto = porNome.get(simplificar(ing?.produto)) || porNome.get(simplificar(nomeIng));
    const comum = {
      quantidade: normalizarQuantidade(ing?.quantidade),
      unidade: normalizarUnidade(ing?.unidade),
      observacao: texto(ing?.observacao, LIMITES.observacao) || null,
    };
    if (produto) ingredientes.push({ produtoId: produto.id, nome: produto.nome, ...comum });
    else {
      ingredientes.push({ nomeTemp: nomeIng, nome: nomeIng, ...comum });
      semCadastro.push(nomeIng);
    }
  }
  const passos = (Array.isArray(bruta?.passos) ? bruta.passos : [])
    .map((p) => texto(p, LIMITES.passo))
    .filter(Boolean)
    .slice(0, LIMITES.passos);
  if (!nome || !ingredientes.length || !passos.length) return null;
  return {
    receita: {
      nome: nome.charAt(0).toUpperCase() + nome.slice(1),
      porcoes: inteiro(bruta?.porcoes, 1, 50),
      tempoPreparo: inteiro(bruta?.tempoPreparo, 1, 1440),
      ingredientes,
      passos,
    },
    semCadastro,
  };
}

/** Receita já existente com o mesmo nome (sem acento/caixa); não rejeitada vence. */
export function acharPorNome(receitas, nome) {
  const alvo = simplificar(nome);
  const iguais = receitas.filter((r) => simplificar(r.nome) === alvo);
  return iguais.find((r) => r.status !== "rejeitada") || iguais[0] || null;
}

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Corpo { prato|nome, data?, receitaId?, mensagemId? } → pedido, ou null se inválido. */
export function lerCorpoComida(corpo, hoje) {
  const nome = texto(corpo?.prato ?? corpo?.nome, LIMITES.nome);
  if (!nome) return null;
  let data = hoje;
  if (corpo?.data != null) {
    const m = String(corpo.data).match(RE_DATA);
    const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (!m || d.getUTCDate() !== +m[3] || d.getUTCMonth() !== +m[2] - 1) return null;
    data = corpo.data;
  }
  const receitaId = typeof corpo?.receitaId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(corpo.receitaId) ? corpo.receitaId : null;
  const mensagemId = corpo?.mensagemId != null ? String(corpo.mensagemId).slice(0, 64) : null;
  return { nome, data, receitaId, mensagemId };
}
