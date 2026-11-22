import {
  ChevronsUp,
  ChevronsDown,
  Search,
  X,
  Plus,
  Menu as MenuIcon,
  MessageCircle,
  ArrowUpDown,
} from "lucide-react";
import FiltroCategoria from "../FiltroCategoria";
import BotaoIcone from "../BotaoIcone";
import { TIPOGRAFIA, FONTE, RAIO, BOTAO_SECUNDARIO, COR } from "../../utils/estilos";

/**
 * Faixa "Modo admin ativo" + cabeçalho fixo da Home: logo, chat e menu,
 * busca, filtro de grupos (lista e catálogo), ordenação e "Nova receita"
 * (listagem de receitas) e "Nova dica" (listagem de dicas, só admins).
 *
 * navReceita/navDica vêm de useNavegacaoReceitas/useNavegacaoDicas (Home).
 */
export default function CabecalhoHome({
  aba,
  admin,
  edicaoAdmin,
  busca,
  setBusca,
  grupoFiltro,
  setGrupoFiltro,
  categoriasFiltro,
  expandidas,
  onAlternarExpandidas,
  chatNaoLido,
  chatEnviando,
  chatAberto,
  onAbrirChat,
  onAbrirMenu,
  ordenacaoReceitas,
  onAbrirOrdenacao,
  navReceita,
  navDica,
  pushBack,
  descartar,
}) {
  const { telaReceitaEfetiva, setTelaReceita } = navReceita;
  const { telaDicaEfetiva, setTelaDica, setEditandoDica } = navDica;
  // A busca só filtra a listagem: no detalhe/formulário de receita ou dica ela não faz nada.
  const mostrarBusca =
    !(aba === "receitas" && telaReceitaEfetiva !== "lista") &&
    !(aba === "dicas" && telaDicaEfetiva !== "lista");

  return (
    <>
      {edicaoAdmin && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "480px",
            background: COR.erro,
            padding: "1px 0",
            textAlign: "center",
            ...TIPOGRAFIA.label,
            color: "white",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          Modo admin ativo
        </div>
      )}
      {/* Header */}
      <div
        style={{
          background: "var(--card)",
          boxShadow: "var(--shadow)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            padding: "16px 20px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "Comfortaa, sans-serif",
                fontWeight: 700,
                fontSize: "20px",
              }}
            >
              <span style={{ color: "var(--amarelo)" }}>QueQue</span>
              <span style={{ color: "var(--laranja)" }}>Falta</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <BotaoIcone
              icone={MessageCircle}
              tamanho={22}
              rotulo="Chat"
              onClick={onAbrirChat}
              style={{ margin: "-6px 0" }}
            >
              {(chatNaoLido || chatEnviando) && !chatAberto && (
                <div style={{
                  position: "absolute", top: "6px", right: "5px",
                  width: "10px", height: "10px", borderRadius: RAIO.full,
                  background: chatNaoLido ? "var(--laranja)" : "var(--text-soft)",
                }} />
              )}
            </BotaoIcone>
            <BotaoIcone
              icone={MenuIcon}
              tamanho={22}
              rotulo="Menu"
              onClick={() => onAbrirMenu()}
              style={{ margin: "-6px -9px -6px 0" }}
            />
          </div>
        </div>

        {/* Busca */}
        {mostrarBusca && <div style={{ padding: "0 16px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "var(--bg)",
              borderRadius: RAIO.md,
              padding: "10px 14px",
            }}
          >
            <Search size={18} color="var(--text-soft)" />
            <input
              type="search"
              aria-label="Buscar"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                aba === "lista" ? "Buscar na lista..." : aba === "catalogo" ? "Buscar no catálogo..." : aba === "dicas" ? "Buscar dicas..." : "Buscar receitas..."
              }
              style={{
                border: "none",
                background: "transparent",
                fontFamily: "Nunito, sans-serif",
                fontSize: FONTE.campo,
                flex: 1,
                color: "var(--text)",
              }}
            />
            {busca && (
              <BotaoIcone
                icone={X}
                tamanho={16}
                rotulo="Limpar busca"
                onClick={() => setBusca("")}
                style={{ margin: "-9px -11px -9px 0" }}
              />
            )}
          </div>
        </div>}

        {/* Filtro categorias — lista e catálogo */}
        {(aba === "lista" || aba === "catalogo") && <FiltroCategoria
          categoriasFiltro={grupoFiltro}
          setCategoriasFiltro={setGrupoFiltro}
          pushBack={pushBack}
          descartar={descartar}
          categorias={categoriasFiltro}
          botoesExtras={
              <button
                onClick={onAlternarExpandidas}
                style={{
                  ...BOTAO_SECUNDARIO,
                  padding: "6px 14px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {expandidas ? (
                  <>
                    <ChevronsUp size={14} /> Recolher
                  </>
                ) : (
                  <>
                    <ChevronsDown size={14} /> Expandir
                  </>
                )}
              </button>
          }
        />}

        {/* Ordenação + nova receita — só na listagem de receitas */}
        {aba === "receitas" && telaReceitaEfetiva === "lista" && (
          <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={onAbrirOrdenacao}
              style={{
                ...BOTAO_SECUNDARIO,
                padding: "6px 14px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--amarelo)",
                color: COR.textoSobreDestaque,
                border: "none",
              }}
            >
              <ArrowUpDown size={14} />
              {ordenacaoReceitas === "az" ? "A→Z" : ordenacaoReceitas === "za" ? "Z→A" : "Relevância"}
            </button>
            {admin && (
              <button
                onClick={() => { setTelaReceita("texto"); pushBack(() => setTelaReceita("lista"), "receita"); }}
                style={{
                  ...BOTAO_SECUNDARIO,
                  padding: "6px 14px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Plus size={14} /> Nova receita
              </button>
            )}
          </div>
        )}

        {/* Nova dica — só admins, na listagem de dicas */}
        {aba === "dicas" && telaDicaEfetiva === "lista" && admin && (
          <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setEditandoDica(false);
                setTelaDica("formulario");
                pushBack(() => setTelaDica("lista"), "dica");
              }}
              style={{
                ...BOTAO_SECUNDARIO,
                padding: "6px 14px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Plus size={14} /> Nova dica
            </button>
          </div>
        )}
      </div>
    </>
  );
}
