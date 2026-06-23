import { useState, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { ORDEM_CATEGORIAS, textoParaCor } from "../utils/categorias";
import { useLista } from "../hooks/useLista";
import { useCatalogo } from "../hooks/useCatalogo";
import { useTema } from "../hooks/useTema";
import CategoriaGrupo from "../components/CategoriaGrupo";
import DetalhesProduto from "../components/DetalhesProduto";
import Menu from "../components/Menu";
import {
  ChevronsUp,
  ChevronsDown,
  ShoppingCart,
  BookOpen,
  ChefHat,
  Search,
  X,
  Plus,
  Menu as MenuIcon,
} from "lucide-react";
import { isAdmin } from "../config/admins";
import { useSugestoes } from "../hooks/useSugestoes";
import { useReceitas } from "../hooks/useReceitas";
import { useGrupoSubstituicao } from "../hooks/useGrupoSubstituicao";
import { ReceitaLista } from "../components/receitas/ReceitaLista";
import { ReceitaDetalhe } from "../components/receitas/ReceitaDetalhe";
import { ReceitaFormulario } from "../components/receitas/ReceitaFormulario";
import { ReceitaTexto } from "../components/receitas/ReceitaTexto";
import FiltroCategoria from "../components/FiltroCategoria";
import {
  TIPOGRAFIA,
  FONTE,
  RAIO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  COR,
} from "../utils/estilos";

function Home({
  usuario,
  listaAtiva,
  todasListas,
  setListaAtiva,
  setTodasListas,
}) {
  const {
    lista,
    carregando: carregandoLista,
    adicionarItem,
    toggleComprado,
    removerItem,
  } = useLista(listaAtiva);
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const { catalogo, carregando: carregandoCatalogo } = useCatalogo();
  const { escuro, toggleTema, seguirSistema } = useTema();
  const [aba, setAba] = useState("lista");
  const [busca, setBusca] = useState("");
  const [categoriasFiltro, setCategoriasFiltro] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const {
    sugestoes,
    pendentes: sugestoesPendentes,
    aprovar,
    rejeitar,
    atualizar,
    deletar,
  } = useSugestoes(usuario);
  const {
    aprovadas: receitasAprovadas,
    pendentes: receitasPendentes,
    sugerir: sugerirReceita,
    aprovar: aprovarReceita,
    rejeitar: rejeitarReceita,
    deletar: deletarReceita,
    atualizar: atualizarReceita,
  } = useReceitas(usuario);
  const { grupoSubstituicao } = useGrupoSubstituicao();
  const [modoAdmin, setModoAdmin] = useState(false);
  const admin = isAdmin(usuario.email);
  const [telaMenu, setTelaMenu] = useState("menu");
  const [receitaSelecionada, setReceitaSelecionada] = useState(null);
  const [telaReceita, setTelaReceita] = useState("lista"); // "lista" | "detalhe" | "texto" | "formulario"
  const [textoReceita, setTextoReceita] = useState("");
  const [dadosParseados, setDadosParseados] = useState(null);
  const [refeicoesFiltro, setRefeicoesFiltro] = useState([]);
  const CATEGORIAS_RECEITA = ["Café da manhã", "Almoço", "Lanche", "Jantar", "Sobremesa"];

  const filtrar = (arr) =>
    arr.filter((p) => {
      const buscaOk = p.nome.toLowerCase().includes(busca.toLowerCase());
      const categoriaOk =
        categoriasFiltro.length === 0 || categoriasFiltro.includes(p.categoria);
      return buscaOk && categoriaOk;
    });

  const agrupar = (arr) =>
    ORDEM_CATEGORIAS.reduce((acc, cat) => {
      const itens = arr.filter((p) => p.categoria === cat);
      if (itens.length > 0) acc[cat] = itens;
      return acc;
    }, {});

  const pendentes = filtrar(lista.filter((i) => !i.comprado));
  const comprados = filtrar(lista.filter((i) => i.comprado));
  const porCategoriaPendentes = agrupar(pendentes);
  const porCategoriaComprados = agrupar(comprados);
  const catalogoFiltrado = filtrar(catalogo);
  const porCategoriaCatalogo = agrupar(catalogoFiltrado);
  const carregando = carregandoLista || carregandoCatalogo;
  const receitasFiltradas = receitasAprovadas.filter(r => {
    const buscaOk = r.nome.toLowerCase().includes(busca.toLowerCase());
    const refeicaoOk = refeicoesFiltro.length === 0 || refeicoesFiltro.includes(r.categoria);
    return buscaOk && refeicaoOk;
  });

  const abrirProduto = (item) => {
    const produto =
      catalogo.find((p) => p.id === item.produtoId) ||
      catalogo.find((p) => p.nome === item.nome);
    if (produto) setProdutoSelecionado({ ...produto, _origemLista: true });
  };

  const removerItemPorProdutoId = (produto) => {
    const item = lista.find((i) => i.produtoId === produto.id);
    if (item) removerItem(item);
  };

  const [todasExpandidas, setTodasExpandidas] = useState(true);

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: "72px",
        background: "var(--bg)",
      }}
    >
      {admin && modoAdmin && (
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
          Modo Edição Ativo
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
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => setMenuAberto(true)}
            >
              <MenuIcon size={22} color="var(--text-soft)" />
              {admin && modoAdmin && (sugestoesPendentes.length + receitasPendentes.length) > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    background: "var(--amarelo)",
                    color: "var(--text)",
                    borderRadius: RAIO.full,
                    width: "18px",
                    height: "18px",
                    fontSize: FONTE.xs,
                    fontWeight: FONTE.extrabold,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {sugestoesPendentes.length + receitasPendentes.length}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Busca */}
        <div style={{ padding: "0 16px 12px" }}>
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
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                aba === "lista" ? "Buscar na lista..." : aba === "catalogo" ? "Buscar no catálogo..." : "Buscar receitas..."
              }
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontFamily: "Nunito, sans-serif",
                fontSize: FONTE.base,
                flex: 1,
                color: "var(--text)",
              }}
            />
            {busca && (
              <X
                size={16}
                color="var(--text-soft)"
                style={{ cursor: "pointer" }}
                onClick={() => setBusca("")}
              />
            )}
          </div>
        </div>

        {/* Filtro categorias */}
        {<FiltroCategoria
          categoriasFiltro={aba === "receitas" ? refeicoesFiltro : categoriasFiltro}
          setCategoriasFiltro={aba === "receitas" ? setRefeicoesFiltro : setCategoriasFiltro}
          categorias={aba === "receitas" ? CATEGORIAS_RECEITA : undefined}
          tituloModal={aba === "receitas" ? "Refeição" : "Filtrar"}
          botoesExtras={
            aba === "catalogo" ? (
              <button
                onClick={() => setTodasExpandidas((e) => !e)}
                style={{
                  ...BOTAO_SECUNDARIO,
                  padding: "6px 14px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {todasExpandidas ? (
                  <>
                    <ChevronsUp size={14} /> Recolher
                  </>
                ) : (
                  <>
                    <ChevronsDown size={14} /> Expandir
                  </>
                )}
              </button>
            ) : aba === "receitas" && admin ? (
              <button
                onClick={() => setTelaReceita("texto")}
                style={{
                  ...BOTAO_SECUNDARIO,
                  padding: "6px 14px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Plus size={14} /> Receita
              </button>
            ) : null
          }
        />}
      </div>

      {/* Aba Lista */}
      {aba === "lista" && (
        <div style={{ padding: "20px 16px" }}>
          {carregando && (
            <p style={{ textAlign: "center", color: "var(--text-soft)" }}>
              Carregando...
            </p>
          )}
          {!carregando &&
            busca &&
            pendentes.length === 0 &&
            comprados.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "60px",
                  padding: "0 20px",
                }}
              >
                <p style={{ fontSize: "48px" }}>🔍</p>
                <p
                  style={{
                    ...TIPOGRAFIA.h2,
                    marginTop: "12px",
                    color: "var(--text)",
                  }}
                >
                  "{busca}" não está na sua lista
                </p>
                <p
                  style={{
                    ...TIPOGRAFIA.corpo,
                    color: "var(--text-soft)",
                    marginTop: "8px",
                    lineHeight: 1.5,
                  }}
                >
                  Quer procurar no Catálogo?
                </p>
                <button
                  onClick={() => setAba("catalogo")}
                  style={{
                    marginTop: "20px",
                    padding: "14px 24px",
                    ...BOTAO_PRIMARIO,
                    borderRadius: RAIO.md,
                    color: "white",
                    boxShadow: "0 4px 12px #FE5F0133",
                  }}
                >
                  🛍️ Buscar no Catálogo
                </button>
              </div>
            )}
          {Object.entries(porCategoriaPendentes).map(([categoria, itens]) => (
            <CategoriaGrupo
              key={categoria}
              categoria={categoria}
              itens={itens}
              onToggle={toggleComprado}
              onAbrir={abrirProduto}
              busca={busca}
              itensDaLista={lista}
              onRemover={removerItem}
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
                onToggle={toggleComprado}
                onAbrir={abrirProduto}
                busca={busca}
                itensDaLista={lista}
                collapsed={true}
                corOverride={COR.neutro}
                onRemover={removerItem}
              />
            </div>
          )}
        </div>
      )}

      {/* Aba Catálogo */}
      {aba === "catalogo" && (
        <div style={{ padding: "20px 16px" }}>
          {/* Pendentes — só visíveis em modo admin */}
          {admin && modoAdmin && sugestoesPendentes.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", marginBottom: "10px" }}>
                Pendentes ({sugestoesPendentes.length})
              </p>
              {sugestoesPendentes.map((s) => {
                const jaAprovou = s.aprovadores?.includes(usuario.uid);
                return (
                  <div
                    key={s.id}
                    style={{
                      opacity: 0.5,
                      marginBottom: "8px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 16px",
                        background: "var(--card)",
                        borderRadius: RAIO.md,
                        boxShadow: "var(--shadow)",
                        borderLeft: `4px solid ${COR.neutro}`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...TIPOGRAFIA.nomeProduto, color: "var(--text)" }}>{s.nome}</p>
                        <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>
                          {s.categoria}{s.subcategoria ? ` · ${s.subcategoria}` : ""}
                        </p>
                        {s.status === "aguardando_segunda_aprovacao" && (
                          <p style={{ ...TIPOGRAFIA.subcategoria, color: COR.neutro, marginTop: "2px" }}>
                            {s.aprovadores?.length}/2 aprovações
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                          onClick={() => !jaAprovou && aprovar(s)}
                          disabled={jaAprovou}
                          style={{
                            padding: "6px 12px",
                            borderRadius: RAIO.sm,
                            border: "none",
                            background: jaAprovou ? COR.borda : COR.sucessoBg,
                            color: jaAprovou ? COR.neutro : COR.sucesso,
                            fontFamily: "Nunito, sans-serif",
                            fontSize: FONTE.sm,
                            fontWeight: FONTE.bold,
                            cursor: jaAprovou ? "default" : "pointer",
                          }}
                        >
                          {jaAprovou ? "Aprovado" : "Aprovar"}
                        </button>
                        <button
                          onClick={() => rejeitar(s)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: RAIO.sm,
                            border: "none",
                            background: COR.erroBg,
                            color: COR.erro,
                            fontFamily: "Nunito, sans-serif",
                            fontSize: FONTE.sm,
                            fontWeight: FONTE.bold,
                            cursor: "pointer",
                          }}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {carregando && (
            <p style={{ textAlign: "center", color: "var(--text-soft)" }}>
              Carregando...
            </p>
          )}
          {!carregando && catalogoFiltrado.length === 0 && (
            <div
              style={{
                textAlign: "center",
                marginTop: "60px",
                padding: "0 20px",
              }}
            >
              <p style={{ fontSize: "48px" }}>🔍</p>
              <p
                style={{
                  ...TIPOGRAFIA.h2,
                  marginTop: "12px",
                  color: "var(--text)",
                }}
              >
                Não encontramos "{busca}"
              </p>
              <p
                style={{
                  ...TIPOGRAFIA.corpo,
                  color: "var(--text-soft)",
                  marginTop: "8px",
                  lineHeight: 1.5,
                }}
              >
                Esse produto ainda não está no catálogo.
              </p>
              <button
                onClick={() => {
                  setMenuAberto(true);
                  setTelaMenu("sugestao");
                }}
                style={{
                  marginTop: "20px",
                  padding: "14px 24px",
                  ...BOTAO_PRIMARIO,
                  borderRadius: RAIO.md,
                  color: "white",
                  boxShadow: "0 4px 12px #FE5F0133",
                }}
              >
                💡 Sugerir produto
              </button>
            </div>
          )}
          {Object.entries(porCategoriaCatalogo).map(([categoria, itens]) => (
            <CategoriaGrupo
              key={categoria}
              categoria={categoria}
              itens={itens}
              onToggle={adicionarItem}
              onAbrir={setProdutoSelecionado}
              busca={busca}
              itensDaLista={lista}
              contexto="catalogo"
              onRemover={removerItemPorProdutoId}
              forcarAberto={todasExpandidas}
            />
          ))}
        </div>
      )}

      {/* Aba Receitas */}
      {aba === "receitas" && (
        <div style={{ padding: "20px 16px 96px" }}>
          {admin && modoAdmin && receitasPendentes.length > 0 && telaReceita === "lista" && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", marginBottom: "10px" }}>
                Pendentes ({receitasPendentes.length})
              </p>
              {receitasPendentes.map((r) => {
                const temIngredienteTemp = r.ingredientes?.some((ing) => ing.nomeTemp);
                return (
                  <div
                    key={r.id}
                    style={{
                      opacity: 0.6,
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 16px",
                        background: "var(--card)",
                        borderRadius: RAIO.md,
                        boxShadow: "var(--shadow)",
                        borderLeft: `4px solid ${COR.neutro}`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...TIPOGRAFIA.nomeProduto, color: "var(--text)" }}>{r.nome}</p>
                        <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>
                          {r.categoria}
                        </p>
                        {temIngredienteTemp && (
                          <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--laranja)", marginTop: "2px" }}>
                            ⚠ Ingredientes não catalogados
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                          onClick={() => !temIngredienteTemp && aprovarReceita(r)}
                          disabled={temIngredienteTemp}
                          style={{
                            padding: "6px 12px",
                            borderRadius: RAIO.sm,
                            border: "none",
                            background: temIngredienteTemp ? COR.borda : COR.sucessoBg,
                            color: temIngredienteTemp ? COR.neutro : COR.sucesso,
                            fontFamily: "Nunito, sans-serif",
                            fontSize: FONTE.sm,
                            fontWeight: FONTE.bold,
                            cursor: temIngredienteTemp ? "not-allowed" : "pointer",
                            opacity: temIngredienteTemp ? 0.6 : 1,
                          }}
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => rejeitarReceita(r)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: RAIO.sm,
                            border: "none",
                            background: COR.erroBg,
                            color: COR.erro,
                            fontFamily: "Nunito, sans-serif",
                            fontSize: FONTE.sm,
                            fontWeight: FONTE.bold,
                            cursor: "pointer",
                          }}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {telaReceita === "lista" && (
            <ReceitaLista
              receitas={receitasFiltradas}
              itensEmCasa={lista.filter(i => i.comprado)}
              onVerReceita={(r) => { setReceitaSelecionada(r); setTelaReceita("detalhe"); }}
            />
          )}
          {telaReceita === "detalhe" && receitaSelecionada && (
            <ReceitaDetalhe
              receita={receitaSelecionada}
              itensEmCasa={lista.filter(i => i.comprado)}
              catalogo={catalogo}
              onVoltar={() => { setReceitaSelecionada(null); setTelaReceita("lista"); }}
              onAdicionarFaltantes={async (faltantes) => {
                for (const ing of faltantes) {
                  const produto = catalogo.find(p => p.id === ing.produtoId);
                  if (produto) await adicionarItem(produto);
                }
                setReceitaSelecionada(null);
                setTelaReceita("lista");
                setAba("lista");
              }}
            />
          )}
          {telaReceita === "texto" && (
            <ReceitaTexto
              textoInicial={textoReceita}
              catalogo={catalogo}
              grupoSubstituicao={grupoSubstituicao}
              onVoltar={() => setTelaReceita("lista")}
              onContinuar={(texto, dados) => {
                setTextoReceita(texto);
                setDadosParseados(dados);
                setTelaReceita("formulario");
              }}
            />
          )}
          {telaReceita === "formulario" && (
            <ReceitaFormulario
              catalogo={catalogo}
              grupoSubstituicao={grupoSubstituicao}
              isAdmin={admin}
              dadosIniciais={dadosParseados}
              textoOriginal={textoReceita}
              onVoltarTexto={(texto) => {
                setTextoReceita(texto);
                setTelaReceita("texto");
              }}
              onVoltar={() => { setTextoReceita(""); setDadosParseados(null); setTelaReceita("lista"); }}
              onEnviar={async (dados) => { await sugerirReceita(dados); }}
            />
          )}
        </div>
      )}

      {/* Modal detalhes */}
      {produtoSelecionado && (
        <DetalhesProduto
          produto={
            catalogo.find((p) => p.id === produtoSelecionado.id) ||
            produtoSelecionado
          }
          onFechar={() => setProdutoSelecionado(null)}
          listaAtiva={listaAtiva}
          itemDaLista={lista.find((i) => i.produtoId === produtoSelecionado.id)}
          catalogo={catalogo}
          isAdmin={admin && modoAdmin}
          origemLista={!!produtoSelecionado._origemLista}
        />
      )}

      {/* Menu */}
      {menuAberto && (
        <Menu
          onFechar={() => {
            setMenuAberto(false);
            setTelaMenu("menu");
          }}
          escuro={escuro}
          toggleTema={toggleTema}
          seguirSistema={seguirSistema}
          listaAtiva={listaAtiva}
          todasListas={todasListas}
          setListaAtiva={setListaAtiva}
          setTodasListas={setTodasListas}
          usuario={usuario}
          isAdmin={admin}
          modoAdmin={modoAdmin}
          setModoAdmin={setModoAdmin}
          telaInicial={telaMenu}
        />
      )}

      {/* Navegação inferior */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "480px",
          background: "var(--card)",
          borderTop: `1px solid ${COR.divisoria}`,
          display: "flex",
          zIndex: 20,
        }}
      >
        {[
          { id: "lista", label: "Lista de compras", icon: ShoppingCart },
          { id: "catalogo", label: "Catálogo", icon: BookOpen },
          { id: "receitas", label: "Receitas", icon: ChefHat },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setAba(id);
              setBusca("");
              setCategoriasFiltro([]);
              setRefeicoesFiltro([]);
              if (id !== "receitas") { setTelaReceita("lista"); setReceitaSelecionada(null); }
            }}
            style={{
              flex: 1,
              padding: "12px 0",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              color: aba === id ? "var(--laranja)" : "var(--text-soft)",
              fontFamily: "Nunito, sans-serif",
              ...(aba === id ? TIPOGRAFIA.aba : TIPOGRAFIA.abaInativa),
              transition: "all 0.2s",
              borderTop:
                aba === id ? "2px solid var(--amarelo)" : "2px solid transparent",
            }}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>

    </div>
  );
}

export default Home;
