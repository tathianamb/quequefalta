import { useState, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import {
  ORDEM_CATEGORIAS,
  corDaCategoria,
  textoParaCor,
} from "../utils/categorias";
import { useLista } from "../hooks/useLista";
import { useCatalogo } from "../hooks/useCatalogo";
import { useTema } from "../hooks/useTema";
import CategoriaGrupo from "../components/CategoriaGrupo";
import DetalhesProduto from "../components/DetalhesProduto";
import Menu from "../components/Menu";
import {
  ShoppingCart,
  BookOpen,
  LogOut,
  Search,
  X,
  Menu as MenuIcon,
} from "lucide-react";
import { isAdmin } from "../config/admins";
import { useSugestoes } from "../hooks/useSugestoes";
import AdminPanel from "../components/AdminPanel";

function Home({ usuario, grupoId }) {
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const {
    lista,
    carregando: carregandoLista,
    adicionarItem,
    toggleComprado,
    removerItem,
  } = useLista(grupoId);
  const { catalogo, carregando: carregandoCatalogo } = useCatalogo();
  const { escuro, toggleTema, seguirSistema } = useTema();
  const [aba, setAba] = useState("lista");
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
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
  const [adminAberto, setAdminAberto] = useState(false);
  const admin = isAdmin(usuario.email);
  const [telaMenu, setTelaMenu] = useState("menu");

  const filtrar = (arr) =>
    arr.filter((p) => {
      const buscaOk = p.nome.toLowerCase().includes(busca.toLowerCase());
      const categoriaOk = !categoriaFiltro || p.categoria === categoriaFiltro;
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

  const abrirProduto = (item) => {
    const produto =
      catalogo.find((p) => p.id === item.produtoId) ||
      catalogo.find((p) => p.nome === item.nome);
    if (produto) setProdutoSelecionado(produto);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: "72px",
        background: "var(--bg)",
      }}
    >
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
            <ShoppingCart size={24} color="var(--text)" />
            <span style={{ fontWeight: 900, fontSize: "20px" }}>
              <span style={{ color: "#FEC601" }}>QueQue</span>
              <span style={{ color: "#FE5F01" }}>Falta</span>
            </span>
          </div>
          <div
            style={{ position: "relative", cursor: "pointer" }}
            onClick={() => setMenuAberto(true)}
          >
            <MenuIcon size={22} color="var(--text-soft)" />
            {admin && sugestoesPendentes.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#FEC601",
                  color: "#212529",
                  borderRadius: "50%",
                  width: "18px",
                  height: "18px",
                  fontSize: "11px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {sugestoesPendentes.length}
              </div>
            )}
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
              borderRadius: "12px",
              padding: "10px 14px",
            }}
          >
            <Search size={18} color="var(--text-soft)" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                aba === "lista" ? "Buscar na lista..." : "Buscar no mercado..."
              }
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontFamily: "Nunito, sans-serif",
                fontSize: "15px",
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
        <div
          className="categorias-scroll"
          ref={scrollRef}
          onMouseDown={(e) => {
            isDragging.current = true;
            startX.current = e.pageX - scrollRef.current.offsetLeft;
            scrollLeft.current = scrollRef.current.scrollLeft;
          }}
          onMouseMove={(e) => {
            if (!isDragging.current) return;
            e.preventDefault();
            const x = e.pageX - scrollRef.current.offsetLeft;
            scrollRef.current.scrollLeft =
              scrollLeft.current - (x - startX.current);
          }}
          onMouseUp={() => {
            isDragging.current = false;
          }}
          onMouseLeave={() => {
            isDragging.current = false;
          }}
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            padding: "0 16px 12px",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            msOverflowStyle: "none",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <button
            onClick={() => setCategoriaFiltro(null)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              background: !categoriaFiltro ? "#FE5F01" : "var(--bg)",
              color: !categoriaFiltro ? "white" : "var(--text-soft)",
              transition: "all 0.2s",
            }}
          >
            Todas
          </button>
          {ORDEM_CATEGORIAS.map((cat) => {
            const cor = corDaCategoria(cat);
            const ativo = categoriaFiltro === cat;
            const textoCor = textoParaCor(cor);
            return (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(ativo ? null : cat)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "none",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  background: ativo ? cor : cor + "22",
                  color: ativo ? textoCor : cor,
                  transition: "all 0.2s",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
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
                    fontWeight: 800,
                    fontSize: "20px",
                    marginTop: "12px",
                    color: "var(--text)",
                  }}
                >
                  "{busca}" não está na sua lista
                </p>
                <p
                  style={{
                    color: "var(--text-soft)",
                    marginTop: "8px",
                    lineHeight: 1.5,
                  }}
                >
                  Quer procurar no Mercado?
                </p>
                <button
                  onClick={() => setAba("mercado")}
                  style={{
                    marginTop: "20px",
                    padding: "14px 24px",
                    borderRadius: "14px",
                    border: "none",
                    background: "linear-gradient(135deg, #FEC601, #FE5F01)",
                    color: "white",
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: 800,
                    fontSize: "15px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px #FE5F0133",
                  }}
                >
                  🛍️ Buscar no Mercado
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
                marginTop: "24px",
                borderTop: "1px dashed #DEE2E6",
                paddingTop: "16px",
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
                corOverride="#ADB5BD"
                onRemover={removerItem}
              />
            </div>
          )}
        </div>
      )}

      {/* Aba Mercado */}
      {aba === "mercado" && (
        <div style={{ padding: "20px 16px" }}>
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
                  fontWeight: 800,
                  fontSize: "20px",
                  marginTop: "12px",
                  color: "var(--text)",
                }}
              >
                Não encontramos "{busca}"
              </p>
              <p
                style={{
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
                  borderRadius: "14px",
                  border: "none",
                  background: "linear-gradient(135deg, #FEC601, #FE5F01)",
                  color: "white",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: "15px",
                  cursor: "pointer",
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
            />
          ))}
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
          grupoId={grupoId}
          itemDaLista={lista.find((i) => i.produtoId === produtoSelecionado.id)}
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
          grupoId={grupoId}
          usuario={usuario}
          isAdmin={admin}
          onAbrirAdmin={() => setAdminAberto(true)}
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
          borderTop: "1px solid #F1F3F5",
          display: "flex",
          zIndex: 20,
        }}
      >
        {[
          { id: "lista", label: "Minha Lista", icon: ShoppingCart },
          { id: "mercado", label: "Mercado", icon: BookOpen },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setAba(id);
              setBusca("");
              setCategoriaFiltro(null);
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
              color: aba === id ? "#FE5F01" : "var(--text-soft)",
              fontFamily: "Nunito, sans-serif",
              fontWeight: aba === id ? 800 : 600,
              fontSize: "12px",
              transition: "all 0.2s",
              borderTop:
                aba === id ? "2px solid #FEC601" : "2px solid transparent",
            }}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>

      {adminAberto && (
        <AdminPanel
          onFechar={() => setAdminAberto(false)}
          sugestoes={sugestoes}
          pendentes={sugestoesPendentes}
          aprovar={aprovar}
          rejeitar={rejeitar}
          atualizar={atualizar}
          deletar={deletar}
          usuario={usuario}
        />
      )}
    </div>
  );
}

export default Home;
