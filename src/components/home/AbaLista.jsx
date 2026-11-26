import { useMemo } from "react";
import { Download, Sparkles } from "lucide-react";
import CategoriaGrupo from "../CategoriaGrupo";
import EstadoVazio from "./EstadoVazio";
import { filtrarProdutos, agruparPorCategoria, agruparPorMercado } from "../../utils/listagens";
import { descreverPreco } from "../../utils/precos";
import {
  FONTE,
  RAIO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  COR,
  SOMBRA_LARANJA,
} from "../../utils/estilos";

/**
 * Aba Lista: itens a comprar (por categoria ou por mercado) e o grupo
 * "Tem em casa". Os filtros seguem a busca adiada (termoBusca/buscaAdiada);
 * `busca` é o valor imediato do campo.
 */
export default function AbaLista({
  lista,
  carregando,
  erroLista,
  erroCatalogo,
  busca,
  buscaAdiada,
  termoBusca,
  grupoFiltro,
  itensEmCasa,
  itemPorProduto,
  produtoPorId,
  agrupamentoLista,
  mudarAgrupamento,
  expandidas,
  toggleComprado,
  removerItem,
  onAbrirProduto,
  irParaGrupo,
  irParaAba,
  onAbrirSugestoesMes,
  onAbrirMenu,
}) {
  const pendentes = useMemo(
    () => filtrarProdutos(lista.filter((i) => !i.comprado), termoBusca, grupoFiltro),
    [lista, termoBusca, grupoFiltro],
  );
  const comprados = useMemo(
    () => filtrarProdutos(itensEmCasa, termoBusca, grupoFiltro),
    [itensEmCasa, termoBusca, grupoFiltro],
  );
  const porCategoriaPendentes = useMemo(() => agruparPorCategoria(pendentes), [pendentes]);

  // "Onde comprar" (utils/listagens.js): só calcula quando esse agrupamento
  // está na tela.
  const { ondeDoItem, porMercadoPendentes } = useMemo(() => {
    if (agrupamentoLista !== "mercado") {
      return { ondeDoItem: new Map(), porMercadoPendentes: [] };
    }
    return agruparPorMercado(pendentes, produtoPorId);
  }, [agrupamentoLista, pendentes, produtoPorId]);
  const detalhePrecoDoItem = (item) => {
    const onde = ondeDoItem.get(item.id);
    if (!onde) return null;
    const data = onde.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${descreverPreco(onde)} · preço de ${data}`;
  };
  // incluirOutras: o "Tem em casa" mostra a contagem total no cabeçalho, então
  // nenhum item pode sumir dos subgrupos por não ter categoria conhecida.
  const porCategoriaComprados = useMemo(
    () => agruparPorCategoria(comprados, { incluirOutras: true }),
    [comprados],
  );

  return (
    <div style={{ padding: "20px 16px" }}>
      {erroLista && (
        <p style={{ textAlign: "center", color: "var(--text-soft)" }}>
          Não foi possível carregar a lista. Confira sua conexão ou troque de grupo no menu.
        </p>
      )}
      {!erroLista && carregando && (
        <p style={{ textAlign: "center", color: "var(--text-soft)" }}>
          Carregando...
        </p>
      )}
      {erroCatalogo && (
        <p style={{ textAlign: "center", color: COR.erro }}>
          Não foi possível carregar o catálogo. Verifique a conexão.
        </p>
      )}
      {!carregando &&
        buscaAdiada &&
        pendentes.length === 0 &&
        comprados.length === 0 && (
          <EstadoVazio
            emoji="🔍"
            titulo={<>"{buscaAdiada}" não está na sua lista</>}
            texto="Quer procurar no Catálogo?"
          >
            <button
              onClick={() => irParaAba("catalogo")}
              style={{
                marginTop: "20px",
                padding: "14px 24px",
                ...BOTAO_PRIMARIO,
                borderRadius: RAIO.md,
                color: COR.textoSobreDestaque,
                boxShadow: SOMBRA_LARANJA,
              }}
            >
              🛍️ Buscar no Catálogo
            </button>
          </EstadoVazio>
        )}
      {!carregando && !erroLista && !busca && lista.length === 0 && (
        <EstadoVazio
          emoji="🛒"
          titulo="Sua lista está vazia"
          texto="Escolha no catálogo o que você precisa comprar."
        >
          <button
            onClick={() => irParaAba("catalogo")}
            style={{
              marginTop: "20px",
              padding: "14px 24px",
              ...BOTAO_PRIMARIO,
              borderRadius: RAIO.md,
              color: "white",
              boxShadow: SOMBRA_LARANJA,
            }}
          >
            🛍️ Abrir catálogo
          </button>
        </EstadoVazio>
      )}
      {!carregando && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "16px" }}>
          <div style={{ display: "flex", background: "var(--card)", borderRadius: RAIO.pill, padding: "3px", boxShadow: "var(--shadow)" }}>
            {[["categoria", "Categoria"], ["mercado", "Mercado"]].map(([valor, rotulo]) => {
              const ativo = agrupamentoLista === valor;
              return (
                <button
                  key={valor}
                  onClick={() => mudarAgrupamento(valor)}
                  aria-pressed={ativo}
                  style={{
                    border: "none",
                    borderRadius: RAIO.pill,
                    padding: "6px 12px",
                    background: ativo ? "var(--amarelo)" : "transparent",
                    color: ativo ? COR.textoSobreDestaque : "var(--text-soft)",
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: FONTE.bold,
                    fontSize: "13px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>
          <button
            onClick={onAbrirSugestoesMes}
            style={{ ...BOTAO_SECUNDARIO, padding: "6px 12px", fontSize: "13px", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Sparkles size={14} /> Sugestões do mês
          </button>
        </div>
      )}
      {agrupamentoLista === "categoria" && Object.entries(porCategoriaPendentes).map(([categoria, itens]) => (
        <CategoriaGrupo
          key={categoria}
          categoria={categoria}
          itens={itens}
          contexto="lista"
          onToggle={toggleComprado}
          onAbrir={onAbrirProduto}
          busca={buscaAdiada}
          itemPorProduto={itemPorProduto}
          onRemover={removerItem}
          onFiltrarGrupo={irParaGrupo}
          forcarAberto={expandidas}
        />
      ))}
      {agrupamentoLista === "mercado" && porMercadoPendentes.map((grupo) => (
        <CategoriaGrupo
          key={grupo.chave}
          categoria={grupo.nome}
          itens={grupo.itens}
          corOverride={grupo.cor}
          detalheDoItem={detalhePrecoDoItem}
          contexto="lista"
          onToggle={toggleComprado}
          onAbrir={onAbrirProduto}
          busca={buscaAdiada}
          itemPorProduto={itemPorProduto}
          onRemover={removerItem}
          onFiltrarGrupo={irParaGrupo}
          forcarAberto={expandidas}
        />
      ))}
      {comprados.length > 0 && (
        <div
          style={{
            marginTop: pendentes.length > 0 ? "24px" : "0",
            borderTop: pendentes.length > 0 ? `1px dashed ${COR.borda}` : "none",
            paddingTop: pendentes.length > 0 ? "16px" : "0",
          }}
        >
          <CategoriaGrupo
            key="tem-em-casa"
            categoria="Tem em casa"
            itens={comprados}
            subgrupos={Object.entries(porCategoriaComprados)}
            acao={{
              icone: Download,
              rotulo: "Exportar o que tem em casa",
              onClick: () => onAbrirMenu("exportar-casa"),
            }}
            contexto="lista"
            onToggle={toggleComprado}
            onAbrir={onAbrirProduto}
            busca={buscaAdiada}
            itemPorProduto={itemPorProduto}
            collapsed={true}
            corOverride={COR.neutro}
            onRemover={removerItem}
            onFiltrarGrupo={irParaGrupo}
          />
        </div>
      )}
    </div>
  );
}
