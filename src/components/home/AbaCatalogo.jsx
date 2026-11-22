import { useMemo } from "react";
import CategoriaGrupo from "../CategoriaGrupo";
import EstadoVazio from "./EstadoVazio";
import SugestoesPendentesAdmin from "./SugestoesPendentesAdmin";
import { filtrarProdutos, agruparPorCategoria } from "../../utils/listagens";
import {
  RAIO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  COR,
  SOMBRA_LARANJA,
} from "../../utils/estilos";

/**
 * Aba Catálogo: produtos por categoria (marcar para a lista ou "tem em casa")
 * e, no modo admin, a fila de sugestões pendentes. `sugestoes` é o retorno de
 * useSugestoes; emAndamento/rodarUmaVez/avisarErro vêm de useAvisoErro.
 */
export default function AbaCatalogo({
  catalogo,
  carregando,
  erroCatalogo,
  edicaoAdmin,
  sugestoes,
  busca,
  buscaAdiada,
  termoBusca,
  grupoFiltro,
  setGrupoFiltro,
  itemPorProduto,
  expandidas,
  adicionarItem,
  alternarEmCasa,
  onRemover,
  onAbrirProduto,
  irParaGrupo,
  onAbrirMenu,
  emAndamento,
  rodarUmaVez,
  avisarErro,
}) {
  // Genéricos ("Óleo") existem só como ingrediente de receita — não aparecem
  // no catálogo para entrar na lista, exceto no modo admin (para editar).
  const catalogoFiltrado = useMemo(
    () => filtrarProdutos(edicaoAdmin ? catalogo : catalogo.filter((p) => !p.generico), termoBusca, grupoFiltro),
    [edicaoAdmin, catalogo, termoBusca, grupoFiltro],
  );
  const porCategoriaCatalogo = useMemo(
    () => agruparPorCategoria(catalogoFiltrado, { incluirOutras: edicaoAdmin }),
    [catalogoFiltrado, edicaoAdmin],
  );

  return (
    <div style={{ padding: "20px 16px" }}>
      {/* Pendentes — só visíveis em modo admin */}
      {edicaoAdmin && sugestoes.pendentes.length > 0 && (
        <SugestoesPendentesAdmin
          pendentes={sugestoes.pendentes}
          catalogo={catalogo}
          aprovar={sugestoes.aprovar}
          rejeitar={sugestoes.rejeitar}
          atualizar={sugestoes.atualizar}
          emAndamento={emAndamento}
          rodarUmaVez={rodarUmaVez}
          avisarErro={avisarErro}
        />
      )}
      {carregando && (
        <p style={{ textAlign: "center", color: "var(--text-soft)" }}>
          Carregando...
        </p>
      )}
      {erroCatalogo && (
        <p style={{ textAlign: "center", color: COR.erro }}>
          Não foi possível carregar o catálogo. Verifique a conexão.
        </p>
      )}
      {!carregando && catalogoFiltrado.length === 0 && !busca && grupoFiltro.length > 0 && (
        <EstadoVazio emoji="🔍" titulo="Nenhum produto neste filtro">
          <button
            onClick={() => setGrupoFiltro([])}
            style={{
              marginTop: "20px",
              padding: "14px 24px",
              ...BOTAO_SECUNDARIO,
              borderRadius: RAIO.md,
            }}
          >
            Limpar filtro
          </button>
        </EstadoVazio>
      )}
      {!carregando && catalogoFiltrado.length === 0 && busca && (
        <EstadoVazio
          emoji="🔍"
          titulo={<>Não encontramos "{buscaAdiada}"</>}
          texto="Esse produto ainda não está no catálogo."
        >
          <button
            onClick={() => onAbrirMenu("sugestao")}
            style={{
              marginTop: "20px",
              padding: "14px 24px",
              ...BOTAO_PRIMARIO,
              borderRadius: RAIO.md,
              color: COR.textoSobreDestaque,
              boxShadow: SOMBRA_LARANJA,
            }}
          >
            💡 Sugerir produto
          </button>
        </EstadoVazio>
      )}
      {Object.entries(porCategoriaCatalogo).map(([categoria, itens]) => (
        <CategoriaGrupo
          key={categoria}
          categoria={categoria}
          itens={itens}
          onToggle={adicionarItem}
          onEmCasa={alternarEmCasa}
          onAbrir={onAbrirProduto}
          busca={buscaAdiada}
          itemPorProduto={itemPorProduto}
          contexto="catalogo"
          onRemover={onRemover}
          forcarAberto={expandidas}
          onFiltrarGrupo={irParaGrupo}
        />
      ))}
    </div>
  );
}
