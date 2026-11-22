import { useState } from "react";
import { db } from "../config/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { useEffect, useRef, useMemo, useDeferredValue, lazy, Suspense } from "react";
import { sugerirProduto } from "../config/sugestoes";
import { ORDEM_CATEGORIAS } from "../utils/categorias";
import { criarVerificadorEmCasa, ingredientesFaltantes, escolherVariante } from "../utils/ingredientesEmCasa";
import { useLista } from "../hooks/useLista";
import { useCatalogo } from "../hooks/useCatalogo";
import { useTema } from "../hooks/useTema";
import CategoriaGrupo from "../components/CategoriaGrupo";
import DetalhesProduto from "../components/DetalhesProduto";
import Menu from "../components/Menu";
import { useChat } from "../hooks/useChat";
import {
  ChevronsUp,
  ChevronsDown,
  ShoppingCart,
  BookOpen,
  ChefHat,
  Lightbulb,
  Search,
  X,
  Plus,
  Menu as MenuIcon,
  MessageCircle,
  ArrowUpDown,
  Check,
  Download,
  Sparkles,
} from "lucide-react";

// Cores dos grupos "por mercado" (sem relação com as cores de categoria).
const CORES_MERCADO = ["#4C6EF5", "#12B886", "#F59F00", "#E64980", "#7950F2", "#15AABF"];

// Preferência de agrupamento da lista, só deste aparelho.
function lerAgrupamentoSalvo() {
  try {
    return localStorage.getItem("agrupamentoLista") === "mercado" ? "mercado" : "categoria";
  } catch {
    return "categoria";
  }
}
import { isAdmin } from "../config/admins";
import { useSugestoes } from "../hooks/useSugestoes";
import { useReceitas } from "../hooks/useReceitas";
import { useBackStack } from "../hooks/useBackStack";
import { ReceitaLista } from "../components/receitas/ReceitaLista";
import { ReceitaDetalhe } from "../components/receitas/ReceitaDetalhe";
import { useDicas } from "../hooks/useDicas";
import { DicaLista } from "../components/dicas/DicaLista";
import { DicaDetalhe } from "../components/dicas/DicaDetalhe";
import FiltroCategoria from "../components/FiltroCategoria";
import { ondeComprar, formatarPreco } from "../utils/precos";
import { normalizar } from "../utils/texto";
import {
  TIPOGRAFIA,
  FONTE,
  RAIO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  COR,
  SOMBRA_LARANJA,
} from "../utils/estilos";

// Telas raras: ficam fora do pacote de abertura e carregam na primeira vez que
// são abertas (o service worker já deixa os arquivos em cache).
const Chat = lazy(() => import("../components/Chat"));
const SugestoesMes = lazy(() => import("../components/SugestoesMes"));
const ReceitaTexto = lazy(() => import("../components/receitas/ReceitaTexto").then((m) => ({ default: m.ReceitaTexto })));
const ReceitaFormulario = lazy(() => import("../components/receitas/ReceitaFormulario").then((m) => ({ default: m.ReceitaFormulario })));
const DicaFormulario = lazy(() => import("../components/dicas/DicaFormulario").then((m) => ({ default: m.DicaFormulario })));

function filtrarProdutos(arr, termoBusca, grupoFiltro) {
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

function agrupar(arr, { incluirOutras = false } = {}) {
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

function Home({
  usuario,
  listaAtiva,
  todasListas,
  setListaAtiva,
  setTodasListas,
}) {
  const { catalogo, carregando: carregandoCatalogo, erro: erroCatalogo } = useCatalogo();
  const {
    lista,
    carregando: carregandoLista,
    erro: erroLista,
    avisoGravacao,
    adicionarItem,
    adicionarItemComprado,
    alternarEmCasa,
    toggleComprado,
    removerItem,
  } = useLista(listaAtiva, catalogo);
  const { escuro, preferencia: temaPreferencia, toggleTema, seguirSistema } = useTema();
  const [aba, setAba] = useState("lista");
  const [agrupamentoLista, setAgrupamentoLista] = useState(lerAgrupamentoSalvo);
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [busca, setBusca] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const { naoLida: chatNaoLido, enviando: chatEnviando } = useChat();
  const {
    pendentes: sugestoesPendentes,
    aprovar,
    rejeitar,
    atualizar,
  } = useSugestoes(usuario);
  const {
    aprovadas: receitasAprovadas,
    pendentes: receitasPendentes,
    carregando: carregandoReceitas,
    erro: erroReceitas,
    sugerir: sugerirReceita,
    aprovar: aprovarReceita,
    rejeitar: rejeitarReceita,
    atualizar: atualizarReceita,
  } = useReceitas(usuario);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [sugestaoEditando, setSugestaoEditando] = useState(null); // { id, nome, categoria, subcategoria }
  const [sugestaoNomeFoco, setSugestaoNomeFoco] = useState(false);
  const admin = isAdmin(usuario.email);
  const [telaMenu, setTelaMenu] = useState("menu");
  // Guarda o id (não a cópia): se a receita for editada ou rejeitada por outro
  // admin, o detalhe acompanha, como nas dicas.
  const [receitaSelecionadaId, setReceitaSelecionadaId] = useState(null);
  const [telaReceita, setTelaReceita] = useState("lista"); // "lista" | "detalhe" | "texto" | "formulario"
  const [textoReceita, setTextoReceita] = useState("");
  const [dadosParseados, setDadosParseados] = useState(null);
  const [receitaEditando, setReceitaEditando] = useState(null); // receita pendente sendo editada
  const [ordenacaoReceitas, setOrdenacaoReceitas] = useState("relevancia"); // "relevancia" | "az" | "za"
  const [ordenacaoAberta, setOrdenacaoAberta] = useState(false);
  const {
    dicas,
    carregando: carregandoDicas,
    erro: erroDicas,
    criar: criarDica,
    atualizar: atualizarDica,
    deletar: deletarDica,
  } = useDicas(usuario);
  const [telaDica, setTelaDica] = useState("lista"); // "lista" | "detalhe" | "formulario"
  const [dicaSelecionadaId, setDicaSelecionadaId] = useState(null);
  const [editandoDica, setEditandoDica] = useState(false); // formulário edita a dica selecionada (senão cria nova)

  const { pushBack, voltar, descartar, trocar } = useBackStack();

  // Modais: abrir registra o voltar com uma chave; fechar pelo X ou pelo fundo
  // descarta essa entrada, para o voltar do aparelho não virar toque morto.
  const fecharProduto = () => { setProdutoSelecionado(null); descartar("produto"); };
  const abrirMenu = (tela = "menu") => {
    setTelaMenu(tela);
    setMenuAberto(true);
    pushBack(() => { setMenuAberto(false); setTelaMenu("menu"); }, "menu");
  };
  const fecharMenu = () => { setMenuAberto(false); setTelaMenu("menu"); descartar("menu"); };
  const fecharChat = () => { setChatAberto(false); descartar("chat"); };
  const fecharSugestoesMes = () => { setSugestoesAbertas(false); descartar("sugestoes"); };
  const fecharOrdenacao = () => { setOrdenacaoAberta(false); descartar("ordenacao"); };
  // Fim do formulário de receita (enviada): volta à listagem e tira da pilha
  // as telas de receita que ficaram abertas (texto, detalhe...).
  const concluirFormularioReceita = () => {
    setTextoReceita("");
    setDadosParseados(null);
    setReceitaEditando(null);
    setReceitaSelecionadaId(null);
    setTelaReceita("lista");
    descartar("receita");
  };

  // A digitação atualiza o campo na hora; filtros e agrupamentos seguem o
  // valor adiado, para a tecla não esperar o recálculo da lista.
  const buscaAdiada = useDeferredValue(busca);
  const termoBusca = useMemo(() => normalizar(buscaAdiada), [buscaAdiada]);

  // Aviso de gravação que falhou. As gravações não esperam o servidor (com
  // sinal fraco a promise demora); o erro, quando vem, aparece aqui.
  const [avisoErro, setAvisoErro] = useState(null);
  const timerAvisoRef = useRef(null);
  useEffect(() => () => clearTimeout(timerAvisoRef.current), []);
  const avisarErro = (mensagem, e) => {
    console.error(mensagem, e);
    setAvisoErro(mensagem);
    clearTimeout(timerAvisoRef.current);
    timerAvisoRef.current = setTimeout(() => setAvisoErro(null), 5000);
  };

  // Ações dos botões de aprovar/rejeitar: uma por item por vez. O ref barra o
  // toque duplo no mesmo instante; o estado desabilita os botões do item.
  const emAndamentoRef = useRef(new Set());
  const [emAndamento, setEmAndamento] = useState([]);
  const rodarUmaVez = (id, acao, mensagemErro) => {
    if (emAndamentoRef.current.has(id)) return;
    emAndamentoRef.current.add(id);
    setEmAndamento([...emAndamentoRef.current]);
    Promise.resolve()
      .then(acao)
      .catch((e) => avisarErro(mensagemErro, e))
      .finally(() => {
        emAndamentoRef.current.delete(id);
        setEmAndamento([...emAndamentoRef.current]);
      });
  };

  const irParaGrupo = (grupo) => {
    const abaAtual = aba;
    pushBack(() => { setAba(abaAtual); setGrupoFiltro([]); });
    setAba("catalogo");
    setBusca("");
    setGrupoFiltro([grupo]);
  };

  const itensEmCasa = useMemo(() => lista.filter((i) => i.comprado), [lista]);
  // produtoId -> item da lista (prefere o que está em casa quando houver
  // duplicados antigos), para o catálogo saber o que já está na lista.
  const itemPorProduto = useMemo(() => {
    const mapa = new Map();
    for (const item of lista) {
      const atual = mapa.get(item.produtoId);
      if (!atual || (!atual.comprado && item.comprado)) mapa.set(item.produtoId, item);
    }
    return mapa;
  }, [lista]);
  const pendentes = useMemo(
    () => (aba === "lista" ? filtrarProdutos(lista.filter((i) => !i.comprado), termoBusca, grupoFiltro) : []),
    [aba, lista, termoBusca, grupoFiltro],
  );
  const comprados = useMemo(
    () => (aba === "lista" ? filtrarProdutos(itensEmCasa, termoBusca, grupoFiltro) : []),
    [aba, itensEmCasa, termoBusca, grupoFiltro],
  );
  const porCategoriaPendentes = useMemo(() => agrupar(pendentes), [pendentes]);

  // "Onde comprar": cada item pendente vai para o mercado com o menor preço
  // atual registrado (regra em utils/precos.js). Mercados com mais itens
  // primeiro; itens sem nenhum preço ficam num grupo no fim. Só calcula quando
  // esse agrupamento está na tela.
  const produtoPorId = useMemo(() => new Map(catalogo.map((p) => [p.id, p])), [catalogo]);
  const { ondeDoItem, porMercadoPendentes } = useMemo(() => {
    if (aba !== "lista" || agrupamentoLista !== "mercado") {
      return { ondeDoItem: new Map(), porMercadoPendentes: [] };
    }
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
  }, [aba, agrupamentoLista, pendentes, produtoPorId]);
  const detalhePrecoDoItem = (item) => {
    const onde = ondeDoItem.get(item.id);
    if (!onde) return null;
    const data = onde.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${formatarPreco(onde.preco)} · preço de ${data}`;
  };
  const mudarAgrupamento = (valor) => {
    setAgrupamentoLista(valor);
    try { localStorage.setItem("agrupamentoLista", valor); } catch { /* sem storage: só não lembra */ }
  };
  // incluirOutras: o "Tem em casa" mostra a contagem total no cabeçalho, então
  // nenhum item pode sumir dos subgrupos por não ter categoria conhecida.
  const porCategoriaComprados = useMemo(() => agrupar(comprados, { incluirOutras: true }), [comprados]);
  // Genéricos ("Óleo") existem só como ingrediente de receita — não aparecem
  // no catálogo para entrar na lista, exceto no modo admin (para editar).
  const catalogoFiltrado = useMemo(
    () =>
      aba === "catalogo"
        ? filtrarProdutos(admin && modoAdmin ? catalogo : catalogo.filter((p) => !p.generico), termoBusca, grupoFiltro)
        : [],
    [aba, admin, modoAdmin, catalogo, termoBusca, grupoFiltro],
  );
  const porCategoriaCatalogo = useMemo(
    () => agrupar(catalogoFiltrado, { incluirOutras: admin && modoAdmin }),
    [catalogoFiltrado, admin, modoAdmin],
  );
  const carregando = carregandoLista || carregandoCatalogo;
  // Receitas e quantos ingredientes faltam em cada uma (mesma regra do cartão e
  // do detalhe, ver utils/ingredientesEmCasa.js). Só calcula na aba de receitas.
  const { receitasFiltradas, faltam } = useMemo(() => {
    if (aba !== "receitas") return { receitasFiltradas: [], faltam: new Map() };
    const base = receitasAprovadas.filter((r) => normalizar(r.nome).includes(termoBusca));
    const temEmCasa = criarVerificadorEmCasa(itensEmCasa, catalogo);
    const faltamPorReceita = new Map(base.map((r) => [r.id, ingredientesFaltantes(r, temEmCasa).length]));
    let ordenadas;
    if (ordenacaoReceitas === "az") ordenadas = [...base].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    else if (ordenacaoReceitas === "za") ordenadas = [...base].sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR"));
    // relevancia: receitas com todos os ingredientes em casa primeiro
    else ordenadas = [...base].sort((a, b) => faltamPorReceita.get(a.id) - faltamPorReceita.get(b.id));
    return { receitasFiltradas: ordenadas, faltam: faltamPorReceita };
  }, [aba, receitasAprovadas, termoBusca, itensEmCasa, catalogo, ordenacaoReceitas]);

  const receitaSelecionada = receitasAprovadas.find((r) => r.id === receitaSelecionadaId) ?? null;
  // Se a receita aberta sumir (rejeitada ou editada para pendente), volta pra lista.
  const telaReceitaEfetiva = telaReceita === "detalhe" && !receitaSelecionada ? "lista" : telaReceita;

  const dicaSelecionada = dicas.find((d) => d.id === dicaSelecionadaId) ?? null;
  // Se a dica aberta sumir (excluída aqui ou por outro admin), volta pra lista.
  const telaDicaEfetiva =
    (telaDica === "detalhe" || (telaDica === "formulario" && editandoDica)) && !dicaSelecionada
      ? "lista"
      : telaDica;
  // A busca só filtra a listagem: no detalhe/formulário de receita ou dica ela não faz nada.
  const mostrarBusca =
    !(aba === "receitas" && telaReceitaEfetiva !== "lista") &&
    !(aba === "dicas" && telaDicaEfetiva !== "lista");
  const dicasFiltradas = (() => {
    const termo = termoBusca;
    if (!termo) return dicas;
    return dicas.filter(
      (d) =>
        normalizar(d.titulo).includes(termo) ||
        normalizar(d.texto).includes(termo),
    );
  })();

  const categoriasFiltro = useMemo(() => {
    if (aba !== "lista" && aba !== "catalogo") return [];
    const origem = aba === "catalogo" ? catalogo : lista.map((item) => produtoPorId.get(item.produtoId) ?? item);
    return [...new Set(origem.flatMap((p) => [...(p.grupoSubstituicao ?? []), ...(p.subcategoria ? [p.subcategoria] : [])]))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [aba, catalogo, lista, produtoPorId]);

  const abrirProduto = (item) => {
    const produto = catalogo.find((p) => p.id === item.produtoId);
    if (produto) {
      setProdutoSelecionado({ ...produto, _origemLista: true });
      pushBack(() => setProdutoSelecionado(null), "produto");
    }
  };

  const removerItemPorProdutoId = (produto) => {
    const item = lista.find((i) => i.produtoId === produto.id);
    if (item) removerItem(item);
  };

  const deletarProdutoCatalogo = (produto) => {
    // Remove também da lista ativa, para não deixar item órfão apontando
    // para um produto que não existe mais.
    const item = lista.find((i) => i.produtoId === produto.id);
    if (item) {
      Promise.resolve(removerItem(item)).catch((e) =>
        avisarErro("Não foi possível remover o produto da lista.", e),
      );
    }
    deleteDoc(doc(db, "catalogo", produto.id)).catch((e) =>
      avisarErro("Não foi possível excluir o produto do catálogo.", e),
    );
    fecharProduto();
  };

  const [todasExpandidas, setTodasExpandidas] = useState(true);
  const [todasExpandidasLista, setTodasExpandidasLista] = useState(true);

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
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => { setChatAberto(true); pushBack(() => setChatAberto(false), "chat"); }}
              aria-label="Chat"
            >
              <MessageCircle size={22} color="var(--text-soft)" />
              {(chatNaoLido || chatEnviando) && !chatAberto && (
                <div style={{
                  position: "absolute", top: "-3px", right: "-4px",
                  width: "10px", height: "10px", borderRadius: RAIO.full,
                  background: chatNaoLido ? "var(--laranja)" : "var(--text-soft)",
                }} />
              )}
            </div>
            <div
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => abrirMenu()}
            >
              <MenuIcon size={22} color="var(--text-soft)" />
            </div>
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
              <X
                size={16}
                color="var(--text-soft)"
                style={{ cursor: "pointer" }}
                onClick={() => setBusca("")}
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
                onClick={() => aba === "catalogo"
                  ? setTodasExpandidas((e) => !e)
                  : setTodasExpandidasLista((e) => !e)}
                style={{
                  ...BOTAO_SECUNDARIO,
                  padding: "6px 14px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {(aba === "catalogo" ? todasExpandidas : todasExpandidasLista) ? (
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
              onClick={() => { setOrdenacaoAberta(true); pushBack(() => setOrdenacaoAberta(false), "ordenacao"); }}
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

      {/* Aba Lista */}
      {aba === "lista" && (
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
                  "{buscaAdiada}" não está na sua lista
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
                  onClick={() => { const abaAtual = aba; pushBack(() => setAba(abaAtual)); setAba("catalogo"); }}
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
              </div>
            )}
          {!carregando && !erroLista && !busca && lista.length === 0 && (
            <div
              style={{
                textAlign: "center",
                marginTop: "60px",
                padding: "0 20px",
              }}
            >
              <p style={{ fontSize: "48px" }}>🛒</p>
              <p
                style={{
                  ...TIPOGRAFIA.h2,
                  marginTop: "12px",
                  color: "var(--text)",
                }}
              >
                Sua lista está vazia
              </p>
              <p
                style={{
                  ...TIPOGRAFIA.corpo,
                  color: "var(--text-soft)",
                  marginTop: "8px",
                  lineHeight: 1.5,
                }}
              >
                Escolha no catálogo o que você precisa comprar.
              </p>
              <button
                onClick={() => { const abaAtual = aba; pushBack(() => setAba(abaAtual)); setAba("catalogo"); }}
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
            </div>
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
                onClick={() => { setSugestoesAbertas(true); pushBack(() => setSugestoesAbertas(false), "sugestoes"); }}
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
              onAbrir={abrirProduto}
              busca={buscaAdiada}
              itemPorProduto={itemPorProduto}
              onRemover={removerItem}
              onFiltrarGrupo={irParaGrupo}
              forcarAberto={todasExpandidasLista}
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
              onAbrir={abrirProduto}
              busca={buscaAdiada}
              itemPorProduto={itemPorProduto}
              onRemover={removerItem}
              onFiltrarGrupo={irParaGrupo}
              forcarAberto={todasExpandidasLista}
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
                  onClick: () => abrirMenu("exportar-casa"),
                }}
                contexto="lista"
                onToggle={toggleComprado}
                onAbrir={abrirProduto}
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
                const editando = sugestaoEditando?.id === s.id;
                const ocupado = emAndamento.includes(s.id);
                return (
                  <div
                    key={s.id}
                    style={{
                      opacity: editando ? 1 : 0.5,
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        padding: "12px 16px",
                        background: "var(--card)",
                        borderRadius: RAIO.md,
                        boxShadow: "var(--shadow)",
                        borderLeft: `4px solid ${editando ? "var(--laranja)" : COR.neutro}`,
                      }}
                    >
                      {editando ? (
                        <>
                          {(() => {
                            const termo = normalizar(sugestaoEditando.nome);
                            const sugestoes = termo.length >= 2
                              ? catalogo.filter(p => normalizar(p.nome).includes(termo)).slice(0, 6)
                              : [];
                            const mostrarDropdown = sugestaoNomeFoco && sugestoes.length > 0;
                            return (
                              <div style={{ position: "relative" }}>
                                <input
                                  value={sugestaoEditando.nome}
                                  onChange={e => setSugestaoEditando(prev => ({ ...prev, nome: e.target.value }))}
                                  onFocus={() => setSugestaoNomeFoco(true)}
                                  onBlur={() => setTimeout(() => setSugestaoNomeFoco(false), 150)}
                                  placeholder="Nome *"
                                  style={{
                                    padding: "8px 12px", borderRadius: RAIO.sm,
                                    border: "1.5px solid var(--borda, #DEE2E6)",
                                    background: "var(--bg)", color: "var(--text)",
                                    fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo,
                                    width: "100%", boxSizing: "border-box",
                                  }}
                                />
                                {mostrarDropdown && (
                                  <div style={{
                                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                                    background: "var(--card)", borderRadius: RAIO.md,
                                    border: "1.5px solid var(--borda, #DEE2E6)",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                                    marginTop: "2px", overflow: "hidden",
                                  }}>
                                    {sugestoes.map(p => (
                                      <div
                                        key={p.id}
                                        onMouseDown={() => setSugestaoEditando(prev => ({
                                          ...prev,
                                          nome: p.nome,
                                          categoria: p.categoria ?? prev.categoria,
                                          subcategoria: p.subcategoria ?? prev.subcategoria,
                                        }))}
                                        style={{
                                          padding: "10px 14px", cursor: "pointer",
                                          borderBottom: "1px solid var(--borda, #DEE2E6)",
                                          fontFamily: "Nunito, sans-serif",
                                        }}
                                      >
                                        <p style={{ fontSize: FONTE.sm, color: "var(--text)", margin: 0 }}>{p.nome}</p>
                                        <p style={{ fontSize: FONTE.xs, color: "var(--text-soft)", margin: "2px 0 0" }}>
                                          {p.categoria}{p.subcategoria ? ` · ${p.subcategoria}` : ""} · já no catálogo
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <select
                            value={sugestaoEditando.categoria}
                            onChange={e => setSugestaoEditando(prev => ({ ...prev, categoria: e.target.value, subcategoria: "" }))}
                            style={{
                              padding: "8px 12px", borderRadius: RAIO.sm,
                              border: "1.5px solid var(--borda, #DEE2E6)",
                              background: "var(--bg)", color: sugestaoEditando.categoria ? "var(--text)" : "var(--text-soft)",
                              fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo,
                              width: "100%", boxSizing: "border-box",
                            }}
                          >
                            <option value="">Categoria *</option>
                            {[...ORDEM_CATEGORIAS].sort((a, b) => a.localeCompare(b, "pt-BR")).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          {(() => {
                            const subcats = [...new Set(
                              catalogo
                                .filter(p => p.categoria === sugestaoEditando.categoria && p.subcategoria)
                                .map(p => p.subcategoria)
                            )].sort((a, b) => a.localeCompare(b, "pt-BR"));
                            return (
                              <select
                                value={sugestaoEditando.subcategoria}
                                onChange={e => setSugestaoEditando(prev => ({ ...prev, subcategoria: e.target.value }))}
                                disabled={!sugestaoEditando.categoria}
                                style={{
                                  padding: "8px 12px", borderRadius: RAIO.sm,
                                  border: "1.5px solid var(--borda, #DEE2E6)",
                                  background: "var(--bg)", color: sugestaoEditando.subcategoria ? "var(--text)" : "var(--text-soft)",
                                  fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo,
                                  width: "100%", boxSizing: "border-box",
                                  opacity: !sugestaoEditando.categoria ? 0.5 : 1,
                                }}
                              >
                                <option value="">Subcategoria *</option>
                                {subcats.map(sc => (
                                  <option key={sc} value={sc}>{sc}</option>
                                ))}
                              </select>
                            );
                          })()}
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setSugestaoEditando(null)}
                              style={{
                                padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                                background: "var(--bg)", color: "var(--text-soft)",
                                fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                                fontWeight: FONTE.bold, cursor: "pointer",
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                atualizar(s, {
                                  nome: sugestaoEditando.nome.trim(),
                                  categoria: sugestaoEditando.categoria,
                                  subcategoria: sugestaoEditando.subcategoria,
                                }).catch((e) => avisarErro("Não foi possível salvar a sugestão.", e));
                                setSugestaoEditando(null);
                              }}
                              disabled={!sugestaoEditando.nome.trim() || !sugestaoEditando.categoria || !sugestaoEditando.subcategoria}
                              style={{
                                padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                                background: COR.sucessoBg, color: COR.sucesso,
                                fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                                fontWeight: FONTE.bold, cursor: "pointer",
                                opacity: (!sugestaoEditando.nome.trim() || !sugestaoEditando.categoria || !sugestaoEditando.subcategoria) ? 0.5 : 1,
                              }}
                            >
                              Salvar
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ ...TIPOGRAFIA.nomeProduto, color: "var(--text)" }}>{s.nome}</p>
                            <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>
                              {s.categoria}{s.subcategoria ? ` · ${s.subcategoria}` : ""}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                            <button
                              onClick={() => setSugestaoEditando({ id: s.id, nome: s.nome, categoria: s.categoria ?? "", subcategoria: s.subcategoria ?? "" })}
                              style={{
                                padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                                background: "var(--bg)", color: "var(--text-soft)",
                                fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                                fontWeight: FONTE.bold, cursor: "pointer",
                              }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => s.categoria && rodarUmaVez(s.id, () => aprovar(s), "Não foi possível aprovar a sugestão.")}
                              disabled={!s.categoria || ocupado}
                              style={{
                                padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                                background: !s.categoria ? COR.borda : COR.sucessoBg,
                                color: !s.categoria ? COR.neutro : COR.sucesso,
                                fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                                fontWeight: FONTE.bold, cursor: !s.categoria || ocupado ? "default" : "pointer",
                                opacity: ocupado ? 0.6 : 1,
                              }}
                              title={!s.categoria ? "Defina uma categoria antes de aprovar" : undefined}
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => rodarUmaVez(s.id, () => rejeitar(s), "Não foi possível rejeitar a sugestão.")}
                              disabled={ocupado}
                              style={{
                                padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                                background: COR.erroBg, color: COR.erro,
                                fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                                fontWeight: FONTE.bold, cursor: ocupado ? "default" : "pointer",
                                opacity: ocupado ? 0.6 : 1,
                              }}
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      )}
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
          {erroCatalogo && (
            <p style={{ textAlign: "center", color: COR.erro }}>
              Não foi possível carregar o catálogo. Verifique a conexão.
            </p>
          )}
          {!carregando && catalogoFiltrado.length === 0 && !busca && grupoFiltro.length > 0 && (
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
                Nenhum produto neste filtro
              </p>
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
            </div>
          )}
          {!carregando && catalogoFiltrado.length === 0 && busca && (
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
                Não encontramos "{buscaAdiada}"
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
                onClick={() => abrirMenu("sugestao")}
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
            </div>
          )}
          {Object.entries(porCategoriaCatalogo).map(([categoria, itens]) => (
            <CategoriaGrupo
              key={categoria}
              categoria={categoria}
              itens={itens}
              onToggle={adicionarItem}
              onEmCasa={alternarEmCasa}
              onAbrir={(p) => { setProdutoSelecionado(p); pushBack(() => setProdutoSelecionado(null), "produto"); }}
              busca={buscaAdiada}
              itemPorProduto={itemPorProduto}
              contexto="catalogo"
              onRemover={removerItemPorProdutoId}
              forcarAberto={todasExpandidas}
              onFiltrarGrupo={irParaGrupo}
            />
          ))}
        </div>
      )}

      {/* Aba Receitas */}
      {aba === "receitas" && (
        <div style={{ padding: "20px 16px 96px" }}>
          {admin && modoAdmin && receitasPendentes.length > 0 && telaReceitaEfetiva === "lista" && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", marginBottom: "10px" }}>
                Pendentes ({receitasPendentes.length})
              </p>
              {receitasPendentes.map((r) => {
                const temIngredienteTemp = r.ingredientes?.some((ing) => ing.nomeTemp);
                const ocupado = emAndamento.includes(r.id);
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
                        {temIngredienteTemp && (
                          <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--laranja)", marginTop: "2px" }}>
                            ⚠ Ingredientes não catalogados
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            setReceitaEditando(r);
                            setDadosParseados(r);
                            setTelaReceita("formulario");
                            pushBack(() => { setReceitaEditando(null); setDadosParseados(null); setTelaReceita("lista"); }, "receita");
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: RAIO.sm,
                            border: "none",
                            background: "var(--bg)",
                            color: "var(--text-soft)",
                            fontFamily: "Nunito, sans-serif",
                            fontSize: FONTE.sm,
                            fontWeight: FONTE.bold,
                            cursor: "pointer",
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => !temIngredienteTemp && rodarUmaVez(r.id, () => aprovarReceita(r), "Não foi possível aprovar a receita.")}
                          disabled={temIngredienteTemp || ocupado}
                          style={{
                            padding: "6px 12px",
                            borderRadius: RAIO.sm,
                            border: "none",
                            background: temIngredienteTemp ? COR.borda : COR.sucessoBg,
                            color: temIngredienteTemp ? COR.neutro : COR.sucesso,
                            fontFamily: "Nunito, sans-serif",
                            fontSize: FONTE.sm,
                            fontWeight: FONTE.bold,
                            cursor: temIngredienteTemp ? "not-allowed" : ocupado ? "default" : "pointer",
                            opacity: temIngredienteTemp || ocupado ? 0.6 : 1,
                          }}
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => rodarUmaVez(r.id, () => rejeitarReceita(r), "Não foi possível rejeitar a receita.")}
                          disabled={ocupado}
                          style={{
                            padding: "6px 12px",
                            borderRadius: RAIO.sm,
                            border: "none",
                            background: COR.erroBg,
                            color: COR.erro,
                            fontFamily: "Nunito, sans-serif",
                            fontSize: FONTE.sm,
                            fontWeight: FONTE.bold,
                            cursor: ocupado ? "default" : "pointer",
                            opacity: ocupado ? 0.6 : 1,
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
          {telaReceitaEfetiva === "lista" && (
            <ReceitaLista
              receitas={receitasFiltradas}
              carregando={carregandoReceitas}
              erro={erroReceitas}
              faltam={faltam}
              onVerReceita={(r) => { setReceitaSelecionadaId(r.id); setTelaReceita("detalhe"); pushBack(() => { setReceitaSelecionadaId(null); setTelaReceita("lista"); }, "receita"); }}
            />
          )}
          {telaReceitaEfetiva === "detalhe" && (
            <ReceitaDetalhe
              receita={receitaSelecionada}
              itensEmCasa={itensEmCasa}
              catalogo={catalogo}
              isAdmin={admin}
              onEditar={() => {
                setReceitaEditando(receitaSelecionada);
                setDadosParseados(receitaSelecionada);
                setTelaReceita("formulario");
                // Voltar do formulário reabre o detalhe (a receita continua selecionada).
                pushBack(() => { setReceitaEditando(null); setDadosParseados(null); setTelaReceita("detalhe"); }, "receita");
              }}
              onVoltar={() => voltar(() => { setReceitaSelecionadaId(null); setTelaReceita("lista"); })}
              onToggleEmCasa={async (ing) => {
                const produto = catalogo.find(p => p.id === ing.produtoId);
                if (!produto) return;
                const itemNaLista = lista.find(i => i.produtoId === ing.produtoId);
                if (itemNaLista) {
                  await toggleComprado(itemNaLista);
                } else {
                  await adicionarItemComprado(produto);
                }
              }}
              onAdicionarFaltantes={(faltantes) => {
                // Genérico ("Óleo") não vai para a lista: entra a variante que a
                // casa costuma comprar; sem pista, abre o catálogo no grupo dele
                // para o usuário escolher (ver escolherVariante).
                // Sem await: a gravação segue em segundo plano (não trava sem
                // sinal) e o hook também barra duplicatas; o Set evita pedir duas
                // vezes o mesmo produto (ex.: ovo na massa e na cobertura, ou dois
                // genéricos que resolvem para a mesma variante).
                let grupoParaEscolher = null;
                const jaPedidos = new Set();
                const pedir = (p) => {
                  if (jaPedidos.has(p.id)) return;
                  jaPedidos.add(p.id);
                  adicionarItem(p);
                };
                for (const ing of faltantes) {
                  const produto = catalogo.find(p => p.id === ing.produtoId);
                  if (!produto) continue;
                  if (!produto.generico) { pedir(produto); continue; }
                  const { variante, jaNaLista } = escolherVariante(produto, catalogo, lista, listaAtiva);
                  if (variante) pedir(variante);
                  else if (!jaNaLista) grupoParaEscolher ??= produto.grupoSubstituicao?.[0] ?? null;
                }
                // Sai do detalhe por outro caminho: a entrada dele sai da pilha.
                setReceitaSelecionadaId(null);
                setTelaReceita("lista");
                descartar("receita");
                if (grupoParaEscolher) { irParaGrupo(grupoParaEscolher); return; }
                const abaAntesFaltantes = aba;
                pushBack(() => setAba(abaAntesFaltantes));
                setAba("lista");
              }}
              onBuscarIngrediente={(nome) => {
                setReceitaSelecionadaId(null);
                setTelaReceita("lista");
                descartar("receita");
                const abaAntesIngrediente = aba;
                pushBack(() => setAba(abaAntesIngrediente));
                setAba("catalogo");
                setBusca(nome);
                setGrupoFiltro([]);
              }}
            />
          )}
          {telaReceitaEfetiva === "texto" && (
            <Suspense fallback={null}>
            <ReceitaTexto
              textoInicial={textoReceita}
              catalogo={catalogo}
              onVoltar={() => voltar(() => setTelaReceita("lista"))}
              onContinuar={(texto, dados) => {
                setTextoReceita(texto);
                setDadosParseados(dados);
                setTelaReceita("formulario");
                pushBack(() => setTelaReceita("texto"), "receita");
              }}
            />
            </Suspense>
          )}
          {telaReceitaEfetiva === "formulario" && (
            <Suspense fallback={null}>
            <ReceitaFormulario
              catalogo={catalogo}
              isAdmin={admin && modoAdmin}
              dadosIniciais={dadosParseados}
              textoOriginal={receitaEditando ? null : textoReceita}
              onVoltarTexto={receitaEditando ? null : (texto) => {
                setTextoReceita(texto);
                voltar(() => setTelaReceita("texto"));
              }}
              onVoltar={() => voltar(concluirFormularioReceita)}
              onConcluir={concluirFormularioReceita}
              onEnviar={async (dados) => {
                if (receitaEditando) {
                  await atualizarReceita(receitaEditando, dados);
                } else {
                  await sugerirReceita(dados);
                }
                // Enviada: na tela de sucesso, o voltar do aparelho também
                // encerra o fluxo (não reabre o texto já enviado).
                trocar("receita", concluirFormularioReceita);
              }}
              onSugerirIngrediente={async (nome) => {
                // O formulário só chama isto ao enviar/salvar rascunho, e o
                // erro (se houver) precisa chegar a ele: espera a gravação.
                const { gravacao } = await sugerirProduto({ nome, usuario, listaAtiva });
                await gravacao;
              }}
            />
            </Suspense>
          )}
        </div>
      )}

      {/* Aba Dicas */}
      {aba === "dicas" && (
        <div style={{ padding: "20px 16px 96px" }}>
          {telaDicaEfetiva === "lista" && (
            <DicaLista
              dicas={dicasFiltradas}
              carregando={carregandoDicas}
              erro={erroDicas}
              busca={buscaAdiada}
              onVerDica={(d) => {
                setDicaSelecionadaId(d.id);
                setTelaDica("detalhe");
                pushBack(() => { setDicaSelecionadaId(null); setTelaDica("lista"); }, "dica");
              }}
            />
          )}
          {telaDicaEfetiva === "detalhe" && (
            <DicaDetalhe
              dica={dicaSelecionada}
              isAdmin={admin}
              onVoltar={() => voltar(() => { setDicaSelecionadaId(null); setTelaDica("lista"); })}
              onEditar={() => {
                setEditandoDica(true);
                setTelaDica("formulario");
                pushBack(() => setTelaDica("detalhe"), "dica");
              }}
            />
          )}
          {telaDicaEfetiva === "formulario" && (
            <Suspense fallback={null}>
            <DicaFormulario
              key={editandoDica ? dicaSelecionada.id : "nova"}
              dicaInicial={editandoDica ? dicaSelecionada : null}
              onVoltar={() => voltar(() => setTelaDica(editandoDica ? "detalhe" : "lista"))}
              onSalvar={async (dados) => {
                if (editandoDica) {
                  await atualizarDica(dicaSelecionada, dados);
                } else {
                  await criarDica(dados);
                }
                // Salvou: volta uma tela (edição → detalhe; nova → lista),
                // tirando o formulário da pilha.
                voltar(() => setTelaDica(editandoDica ? "detalhe" : "lista"));
              }}
              onExcluir={async () => {
                await deletarDica(dicaSelecionada);
                setDicaSelecionadaId(null);
                setTelaDica("lista");
                descartar("dica");
              }}
            />
            </Suspense>
          )}
        </div>
      )}

      {/* Modal detalhes */}
      {sugestoesAbertas && (
        <Suspense fallback={null}>
        <SugestoesMes
          catalogo={catalogo}
          listaAtiva={listaAtiva}
          lista={lista}
          adicionarItem={adicionarItem}
          toggleComprado={toggleComprado}
          onFechar={fecharSugestoesMes}
        />
        </Suspense>
      )}

      {produtoSelecionado && (
        <DetalhesProduto
          produto={
            catalogo.find((p) => p.id === produtoSelecionado.id) ||
            produtoSelecionado
          }
          onFechar={fecharProduto}
          listaAtiva={listaAtiva}
          catalogo={catalogo}
          isAdmin={admin && modoAdmin}
          origemLista={!!produtoSelecionado._origemLista}
          onDeletar={admin && modoAdmin ? deletarProdutoCatalogo : undefined}
        />
      )}

      {/* Menu */}
      {menuAberto && (
        <Menu
          onFechar={fecharMenu}
          pushBack={(fn) => pushBack(fn, "menu")}
          voltar={voltar}
          escuro={escuro}
          temaPreferencia={temaPreferencia}
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
          catalogo={catalogo}
          itensEmCasa={itensEmCasa}
        />
      )}

      {/* Aviso de gravação que falhou: da lista (useLista) ou das ações da Home */}
      {(avisoErro || avisoGravacao) && (
        <div
          role="alert"
          style={{
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 32px)",
            maxWidth: "448px",
            padding: "10px 14px",
            borderRadius: RAIO.md,
            background: COR.erroBg,
            color: COR.erro,
            boxShadow: "var(--shadow)",
            ...TIPOGRAFIA.subcategoria,
            textAlign: "center",
            zIndex: 300,
          }}
        >
          {avisoErro || avisoGravacao}
        </div>
      )}

      {/* Chat */}

      {chatAberto && <Suspense fallback={null}><Chat onFechar={fecharChat} itensEmCasa={itensEmCasa} /></Suspense>}

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
          { id: "lista", label: "Lista", icon: ShoppingCart, badge: 0 },
          { id: "catalogo", label: "Catálogo", icon: BookOpen, badge: admin && modoAdmin ? sugestoesPendentes.length : 0 },
          { id: "receitas", label: "Receitas", icon: ChefHat, badge: admin && modoAdmin ? receitasPendentes.length : 0 },
          { id: "dicas", label: "Dicas", icon: Lightbulb, badge: 0 },
        ].map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            aria-current={aba === id ? "page" : undefined}
            onClick={() => {
              if (id !== aba) {
                const abaAtual = aba;
                pushBack(() => {
                  setAba(abaAtual);
                  setBusca("");
                  setGrupoFiltro([]);
                  if (abaAtual !== "receitas") { setTelaReceita("lista"); setReceitaSelecionadaId(null); }
                  if (abaAtual !== "dicas") { setTelaDica("lista"); setDicaSelecionadaId(null); }
                });
              }
              setAba(id);
              setBusca("");
              setGrupoFiltro([]);
              // As telas internas da aba que fica para trás voltam à listagem,
              // então as entradas delas saem da pilha (depois do pushBack acima,
              // para a pilha não esvaziar no meio da troca).
              if (id !== "receitas") { setTelaReceita("lista"); setReceitaSelecionadaId(null); descartar("receita"); }
              if (id !== "dicas") { setTelaDica("lista"); setDicaSelecionadaId(null); descartar("dica"); }
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
            <div style={{ position: "relative" }}>
              <Icon size={20} />
              {badge > 0 && (
                <div style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-8px",
                  background: "var(--amarelo)",
                  color: COR.textoSobreDestaque,
                  borderRadius: RAIO.full,
                  width: "16px",
                  height: "16px",
                  fontSize: FONTE.xs,
                  fontWeight: FONTE.extrabold,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {badge}
                </div>
              )}
            </div>
            {label}
          </button>
        ))}
      </div>

      {/* Bottom sheet ordenação receitas */}
      {ordenacaoAberta && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(0,0,0,0.4)" }}
          onClick={fecharOrdenacao}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--card)", borderRadius: `${RAIO.xxl} ${RAIO.xxl} 0 0`, padding: "24px 20px 48px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ ...TIPOGRAFIA.h2, color: "var(--text)" }}>Ordenar</h2>
              <X size={20} color="var(--text-soft)" style={{ cursor: "pointer" }} onClick={fecharOrdenacao} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { id: "relevancia", label: "Relevância", descricao: "Receitas com mais ingredientes em casa primeiro" },
                { id: "az", label: "A → Z", descricao: "Ordem alfabética crescente" },
                { id: "za", label: "Z → A", descricao: "Ordem alfabética decrescente" },
              ].map(op => (
                <div
                  key={op.id}
                  onClick={() => { setOrdenacaoReceitas(op.id); fecharOrdenacao(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "14px 16px", borderRadius: RAIO.md,
                    background: ordenacaoReceitas === op.id ? "var(--amarelo-suave)" : "var(--bg)",
                    border: `1.5px solid ${ordenacaoReceitas === op.id ? "var(--amarelo)" : "transparent"}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ ...TIPOGRAFIA.nomeProduto, color: "var(--text)" }}>{op.label}</p>
                    <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>{op.descricao}</p>
                  </div>
                  {ordenacaoReceitas === op.id && <Check size={16} color="var(--laranja)" strokeWidth={3} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Home;
