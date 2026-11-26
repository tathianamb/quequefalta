// Regras puras de um registro de preço (catalogo/{id}.historico[]): mercado,
// marca e tamanho da embalagem. O bot e o app (src/utils/precos.js) importam
// este mesmo arquivo para aplicar a mesma regra; por isso ele não tem
// dependências nem usa recursos que navegador antigo não tenha (lookbehind).
//
// Campos opcionais de um registro, além de mercado/preco/data:
//   marca     "Baly"
//   tamanho   número na medida base (473)
//   medida    "g" | "ml" | "un" | "m"
//   unidade   "kg" quando o preço é por quilo (vendido a peso); aí não há tamanho

const simplificar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// ---------------------------------------------------------------- mercado

// Nomes diferentes da mesma loja (confirmado pela casa em 25/11/2026).
// A chave é o nome simplificado (sem acento, minúsculo).
const MERCADOS_EQUIVALENTES = new Map([
  ["max atacadista", "Max"],
  ["max muffato", "Max"],
  ["casa avenida", "Avenida"],
]);

export function mercadoCanonico(nome) {
  const limpo = String(nome ?? "").trim().replace(/\s+/g, " ");
  return MERCADOS_EQUIVALENTES.get(simplificar(limpo)) || limpo;
}

// "Atacadão", "atacadao " e "Max Muffato"/"Max" viram a mesma chave.
export const chaveMercado = (nome) => simplificar(mercadoCanonico(nome));

// ---------------------------------------------------------------- marca

// "-", "sem marca" e vazio = sem marca (null). Texto todo em maiúsculas ou
// todo em minúsculas ganha iniciais maiúsculas ("LA RUVIDA" → "La Ruvida").
export function limparMarca(texto) {
  const t = String(texto ?? "").trim().replace(/\s+/g, " ");
  if (!t || /^(-+|—|sem marca|nenhuma)$/i.test(t)) return null;
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, antes, letra) => antes + letra.toUpperCase());
}

export const chaveMarca = (marca) => (marca ? simplificar(marca) : null);

export const ehSemMarca = (texto) => /^(-+|—|sem marca|nenhuma)$/i.test(String(texto ?? "").trim());

// ---------------------------------------------------------------- tamanho

// Unidade escrita → [medida base, fator].
const UNIDADES = {
  kg: ["g", 1000], kgs: ["g", 1000], g: ["g", 1], gr: ["g", 1], grs: ["g", 1], gramas: ["g", 1],
  l: ["ml", 1000], lt: ["ml", 1000], lts: ["ml", 1000], litro: ["ml", 1000], litros: ["ml", 1000], ml: ["ml", 1],
  un: ["un", 1], und: ["un", 1], unid: ["un", 1], unidades: ["un", 1], rolos: ["un", 1],
  m: ["m", 1], mt: ["m", 1], mts: ["m", 1], metro: ["m", 1], metros: ["m", 1],
};

const arredondar = (n) => Math.round(n * 100) / 100;

// "1.000" numa unidade pequena (g, ml, un, m) é mil; "1,5" e "1.5" são um e meio.
function lerQuantia(texto, unidadePequena) {
  if (unidadePequena && /^\d{1,3}(\.\d{3})+$/.test(texto)) return Number(texto.replace(/\./g, ""));
  return Number(texto.replace(",", "."));
}

function montarTamanho(vezesTexto, quantiaTexto, unidadeTexto) {
  const unidade = UNIDADES[String(unidadeTexto).toLowerCase()];
  if (!unidade) return null;
  const [medida, fator] = unidade;
  const quantia = lerQuantia(quantiaTexto, fator === 1);
  const vezes = vezesTexto ? Number(vezesTexto) : 1;
  const tamanho = arredondar(quantia * fator * vezes);
  return Number.isFinite(tamanho) && tamanho > 0 ? { tamanho, medida } : null;
}

const RE_TAMANHO = /^(?:(\d{1,3})\s*x\s*)?(\d+(?:[.,]\d+)*)\s*([a-z]+)\.?$/;

/** Tamanho escrito de propósito: "473 ml", "1,5L", "500g", "6x200ml", "12 un". */
export function lerTamanho(texto) {
  const m = simplificar(texto).match(RE_TAMANHO);
  return m ? montarTamanho(m[1], m[2], m[3]) : null;
}

// No nome da nota, "m" sozinho só vale em "12X30M": "ESPONJA 3M" é a marca.
const RE_MULTIPLO = /(?:^|[^\d.,])(\d{1,3})\s*x\s*(\d+(?:[.,]\d+)?)\s*(kgs?|grs?|g|ml|lts?|l|mts?|m)(?![a-z])/i;
const RE_SIMPLES = /(?:^|[^\d.,])(\d+(?:[.,]\d+)*)\s*(kgs?|grs?|g|gramas|ml|lts?|l|litros?|und|unid|un|mts?|metros?|rolos)(?![a-z])/gi;
const RE_CAIXA = /(?:^|\s)c\/\s*(\d{1,3})(?![\d.,])/i;

/** Tamanho tirado do nome impresso na nota ("ENERG BALY 473ML" → 473 ml). */
export function extrairTamanho(nome) {
  const texto = String(nome ?? "");
  const multiplo = texto.match(RE_MULTIPLO);
  if (multiplo) return montarTamanho(multiplo[1], multiplo[2], multiplo[3]);
  const achados = [...texto.matchAll(RE_SIMPLES)].map((m) => montarTamanho(null, m[1], m[2])).filter(Boolean);
  // "KIT 2UN 500ML": o peso/volume diz mais que a contagem.
  const pesoOuVolume = achados.filter((a) => a.medida === "g" || a.medida === "ml");
  if (pesoOuVolume.length) return pesoOuVolume[pesoOuVolume.length - 1];
  if (achados.length) return achados[achados.length - 1];
  const caixa = texto.match(RE_CAIXA);
  return caixa ? montarTamanho(null, caixa[1], "un") : null;
}

const numeroBr = (n) => String(arredondar(n)).replace(".", ",");

export function formatarTamanho({ tamanho, medida } = {}) {
  if (!(tamanho > 0)) return "";
  if (medida === "g") return tamanho >= 1000 ? `${numeroBr(tamanho / 1000)} kg` : `${numeroBr(tamanho)} g`;
  if (medida === "ml") return tamanho >= 1000 ? `${numeroBr(tamanho / 1000)} L` : `${numeroBr(tamanho)} ml`;
  if (medida === "un" || medida === "m") return `${numeroBr(tamanho)} ${medida}`;
  return "";
}

// "Baly · 473 ml", "Aurora · a peso", "" quando não se sabe nada.
export function descreverVariacao(h = {}) {
  const tamanho = h.unidade === "kg" ? "a peso" : formatarTamanho(h);
  return [h.marca, tamanho].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------- preço

const POR_MEDIDA = { g: ["kg", 1000], ml: ["L", 1000], un: ["un", 1], m: ["m", 1] };

/** R$ por kg, L, unidade ou metro, ou null sem tamanho. A peso já é por kg. */
export function precoPorMedida(h) {
  if (!h || typeof h.preco !== "number" || !Number.isFinite(h.preco)) return null;
  if (h.unidade === "kg") return { valor: h.preco, por: "kg" };
  const conversao = h.tamanho > 0 && POR_MEDIDA[h.medida];
  return conversao ? { valor: (h.preco / h.tamanho) * conversao[1], por: conversao[0] } : null;
}

// ---------------------------------------------------------------- registros

export function diaDoRegistro(h) {
  const d = h?.data?.toDate ? h.data.toDate() : h?.data ? new Date(h.data) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

function variacao(h) {
  return {
    marca: chaveMarca(h.marca),
    tamanho: h.unidade === "kg" ? "kg" : h.tamanho > 0 ? `${h.tamanho}${h.medida}` : null,
  };
}

// O registro `velho` não diz nada que o `novo` contradiga: cada campo que o
// velho conhece (marca, tamanho) é igual no novo. Aí o novo o substitui.
export function substitui(novo, velho) {
  const a = variacao(novo);
  const b = variacao(velho);
  return (b.marca == null || b.marca === a.marca) && (b.tamanho == null || b.tamanho === a.tamanho);
}

/**
 * Esse preço já foi registrado? Mesmo mercado e dia, e nada que diferencie:
 * marca e tamanho iguais quando os dois lados sabem. Quando um lado não sabe,
 * o preço decide (nota reenviada repete o preço; outra marca ou outro
 * tamanho no mesmo dia, em geral, não).
 * `porPreco: false` (registro digitado no app): sem marca ou tamanho que
 * diferencie, o mesmo mercado e dia já é repetido, qualquer que seja o preço.
 * @param {Array} historico
 * @param {{ mercado, dia: "aaaa-mm-dd", preco, marca?, tamanho?, medida?, unidade? }} novo
 */
export function jaRegistrado(historico, novo, { porPreco = true } = {}) {
  const chave = chaveMercado(novo.mercado);
  const b = variacao(novo);
  return (historico || []).some((h) => {
    if (chaveMercado(h.mercado) !== chave || diaDoRegistro(h) !== novo.dia) return false;
    const a = variacao(h);
    if (a.marca && b.marca && a.marca !== b.marca) return false;
    if (a.tamanho && b.tamanho && a.tamanho !== b.tamanho) return false;
    const tudoConhecido = a.marca && b.marca && a.tamanho && b.tamanho;
    return Boolean(tudoConhecido) || !porPreco || Math.abs(h.preco - novo.preco) < 0.005;
  });
}

/** Campos de marca/tamanho para gravar num registro (só os que se sabe). */
export function camposDaVariacao({ marca, tamanho, medida, unidade } = {}) {
  const campos = {};
  if (marca) campos.marca = marca;
  if (unidade !== "kg" && tamanho > 0 && POR_MEDIDA[medida]) {
    campos.tamanho = tamanho;
    campos.medida = medida;
  }
  return campos;
}
