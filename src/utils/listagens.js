// Filtros, agrupamentos e ordenações das abas da Home. Funções puras: a Home
// e as abas chamam dentro de useMemo.
import { ORDEM_CATEGORIAS } from "./categorias";
import { criarVerificadorEmCasa, ingredientesFaltantes } from "./ingredientesEmCasa";
import { ondeComprar } from "./precos";
import { normalizar } from "./texto";
import { COR } from "./estilos";

// Cores dos grupos "por mercado" (sem relação com as cores de categoria).
const CORES_MERCADO = ["#4C6EF5", "#12B886", "#F59F00", "#E64980", "#7950F2", "#15AABF"];

// termoBusca já vem normalizado; grupoFiltro casa com grupoSubstituicao ou subcategoria.
export function filtrarProdutos(arr, termoBusca, grupoFiltro) {
  return arr.filter((p) => {
    const buscaOk = normalizar(p.nome).includes(termoBusca);
    const grupoOk =
      grupoFiltro.length === 0 ||
      grupoFiltro.some(
        (g) =>
          (p.grupoSubstituicao ?? []).includes(g) || p.subcategoria === g,
      );
    return buscaOk && grupoOk;
  });
}

// { categoria: itens[] } na ordem de ORDEM_CATEGORIAS. incluirOutras junta os
// itens sem categoria conhecida num grupo "Outras" no fim.
export function agruparPorCategoria(arr, { incluirOutras = false } = {}) {
  const acc = ORDEM_CATEGORIAS.reduce((acc, cat) => {
    const itens = arr.filter((p) => p.categoria === cat);
    if (itens.length > 0) acc[cat] = itens;
    return acc;
  }, {});
  if (incluirOutras) {
    const semCategoriaValida = arr.filter((p) => !ORDEM_CATEGORIAS.includes(p.categoria));
    if (semCategoriaValida.length > 0) acc["Outras"] = semCategoriaValida;
  }
  return acc;
}

// "Onde comprar": cada item pendente vai para o mercado com o menor preço
// atual registrado (regra em utils/precos.js). Mercados com mais itens
// primeiro; itens sem nenhum preço ficam num grupo no fim.
// Devolve ondeDoItem (itemId -> resultado de ondeComprar) e os grupos.
export function agruparPorMercado(pendentes, produtoPorId) {
  const onde = new Map(pendentes.map((i) => [i.id, ondeComprar(produtoPorId.get(i.produtoId))]));
  const grupos = new Map();
  for (const item of pendentes) {
    const o = onde.get(item.id);
    const chave = o?.chave ?? "";
    if (!grupos.has(chave)) grupos.set(chave, { nome: o?.mercado ?? "Sem preço registrado", itens: [] });
    grupos.get(chave).itens.push(item);
  }
  const porMercado = [...grupos.entries()]
    .sort(([a, ga], [b, gb]) => (a === "") - (b === "") || gb.itens.length - ga.itens.length)
    .map(([chave, g], i) => ({
      ...g,
      chave: chave || "sem-preco",
      cor: chave ? CORES_MERCADO[i % CORES_MERCADO.length] : COR.neutro,
    }));
  return { ondeDoItem: onde, porMercadoPendentes: porMercado };
}

// Receitas filtradas pela busca, ordenadas, e quantos ingredientes faltam em
// cada uma (mesma regra do cartão e do detalhe, ver utils/ingredientesEmCasa.js).
// ordenacao: "relevancia" | "az" | "za".
export function ordenarReceitas(receitas, termoBusca, itensEmCasa, catalogo, ordenacao) {
  const base = receitas.filter((r) => normalizar(r.nome).includes(termoBusca));
  const temEmCasa = criarVerificadorEmCasa(itensEmCasa, catalogo);
  const faltamPorReceita = new Map(base.map((r) => [r.id, ingredientesFaltantes(r, temEmCasa).length]));
  let ordenadas;
  if (ordenacao === "az") ordenadas = [...base].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  else if (ordenacao === "za") ordenadas = [...base].sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR"));
  // relevancia: receitas com todos os ingredientes em casa primeiro
  else ordenadas = [...base].sort((a, b) => faltamPorReceita.get(a.id) - faltamPorReceita.get(b.id));
  return { receitasFiltradas: ordenadas, faltam: faltamPorReceita };
}

// Dicas cujo título ou texto contém o termo (já normalizado).
export function filtrarDicas(dicas, termo) {
  if (!termo) return dicas;
  return dicas.filter(
    (d) =>
      normalizar(d.titulo).includes(termo) ||
      normalizar(d.texto).includes(termo),
  );
}

// Opções do filtro de grupos: grupos de substituição e subcategorias do
// catálogo (aba catálogo) ou dos itens da lista (aba lista), em ordem pt-BR.
export function categoriasDoFiltro(aba, catalogo, lista, produtoPorId) {
  if (aba !== "lista" && aba !== "catalogo") return [];
  const origem = aba === "catalogo" ? catalogo : lista.map((item) => produtoPorId.get(item.produtoId) ?? item);
  return [...new Set(origem.flatMap((p) => [...(p.grupoSubstituicao ?? []), ...(p.subcategoria ? [p.subcategoria] : [])]))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}
