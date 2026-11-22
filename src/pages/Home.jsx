import { useState, useMemo, useDeferredValue, Suspense } from "react";
import { db } from "../config/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { isAdmin } from "../config/admins";
import { useLista } from "../hooks/useLista";
import { useCatalogo } from "../hooks/useCatalogo";
import { useTema } from "../hooks/useTema";
import { useChat } from "../hooks/useChat";
import { useSugestoes } from "../hooks/useSugestoes";
import { useReceitas } from "../hooks/useReceitas";
import { useDicas } from "../hooks/useDicas";
import { useBackStack } from "../hooks/useBackStack";
import { useAbasHome } from "../hooks/useAbasHome";
import { useCallbackEstavel } from "../hooks/useCallbackEstavel";
import { useAvisoErro } from "../hooks/useAvisoErro";
import { useAgrupamentoLista } from "../hooks/useAgrupamentoLista";
import { useNavegacaoReceitas } from "../hooks/useNavegacaoReceitas";
import { useNavegacaoDicas } from "../hooks/useNavegacaoDicas";
import DetalhesProduto from "../components/DetalhesProduto";
import Menu from "../components/Menu";
import CabecalhoHome from "../components/home/CabecalhoHome";
import AbaLista from "../components/home/AbaLista";
import AbaCatalogo from "../components/home/AbaCatalogo";
import AbaReceitas from "../components/home/AbaReceitas";
import AbaDicas from "../components/home/AbaDicas";
import NavInferior from "../components/home/NavInferior";
import OrdenacaoReceitas from "../components/home/OrdenacaoReceitas";
import AvisoErro from "../components/home/AvisoErro";
import { categoriasDoFiltro } from "../utils/listagens";
import { normalizar } from "../utils/texto";
import { lazyComNovaTentativa } from "../utils/lazy";
import LimiteDeErro from "../components/LimiteDeErro";

// Telas raras: ficam fora do pacote de abertura e carregam na primeira vez que
// são abertas (o service worker já deixa os arquivos em cache).
const Chat = lazyComNovaTentativa(() => import("../components/Chat"));
const SugestoesMes = lazyComNovaTentativa(() => import("../components/SugestoesMes"));

/**
 * Tela principal: coordena dados (hooks), aba ativa, busca/filtro, modais e a
 * pilha do voltar (a única instância de useBackStack; os filhos recebem
 * pushBack/voltar/descartar/trocar por props). Cada aba fica em
 * components/home/.
 */
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
  const { naoLida: chatNaoLido, enviando: chatEnviando } = useChat();
  const sugestoes = useSugestoes(usuario);
  const receitas = useReceitas(usuario);
  const dicasApi = useDicas(usuario);
  const navReceita = useNavegacaoReceitas(receitas.aprovadas);
  const navDica = useNavegacaoDicas(dicasApi.dicas);
  const { avisoErro, avisarErro, emAndamento, rodarUmaVez } = useAvisoErro();
  const [agrupamentoLista, mudarAgrupamento] = useAgrupamentoLista();

  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [telaMenu, setTelaMenu] = useState("menu");
  const [chatAberto, setChatAberto] = useState(false);
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [ordenacaoReceitas, setOrdenacaoReceitas] = useState("relevancia"); // "relevancia" | "az" | "za"
  const [ordenacaoAberta, setOrdenacaoAberta] = useState(false);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [todasExpandidas, setTodasExpandidas] = useState(true);
  const [todasExpandidasLista, setTodasExpandidasLista] = useState(true);
  const admin = isAdmin(usuario.email);
  const edicaoAdmin = admin && modoAdmin;

  const { pushBack, voltar, descartar, trocar } = useBackStack();
  const {
    aba,
    busca,
    setBusca,
    grupoFiltro,
    setGrupoFiltro,
    irParaAba,
    irParaGrupo,
    buscarNoCatalogo,
    trocarAba,
  } = useAbasHome({ pushBack, descartar, navReceita, navDica });

  // Modais: abrir registra o voltar com uma chave; fechar pelo X ou pelo fundo
  // descarta essa entrada, para o voltar do aparelho não virar toque morto.
  // Os callbacks que vão para os cartões de produto (React.memo) têm identidade
  // fixa: eles chamam a última versão, então leem o estado atual do render.
  const selecionarProduto = useCallbackEstavel((produto) => {
    setProdutoSelecionado(produto);
    pushBack(() => setProdutoSelecionado(null), "produto");
  });
  const fecharProduto = () => { setProdutoSelecionado(null); descartar("produto"); };
  const abrirMenu = (tela = "menu") => {
    setTelaMenu(tela);
    setMenuAberto(true);
    pushBack(() => { setMenuAberto(false); setTelaMenu("menu"); }, "menu");
  };
  const fecharMenu = () => { setMenuAberto(false); setTelaMenu("menu"); descartar("menu"); };
  const abrirChat = () => { setChatAberto(true); pushBack(() => setChatAberto(false), "chat"); };
  const fecharChat = () => { setChatAberto(false); descartar("chat"); };
  const abrirSugestoesMes = () => { setSugestoesAbertas(true); pushBack(() => setSugestoesAbertas(false), "sugestoes"); };
  const fecharSugestoesMes = () => { setSugestoesAbertas(false); descartar("sugestoes"); };
  const abrirOrdenacao = () => { setOrdenacaoAberta(true); pushBack(() => setOrdenacaoAberta(false), "ordenacao"); };
  const fecharOrdenacao = () => { setOrdenacaoAberta(false); descartar("ordenacao"); };

  // A digitação atualiza o campo na hora; filtros e agrupamentos seguem o
  // valor adiado, para a tecla não esperar o recálculo da lista.
  const buscaAdiada = useDeferredValue(busca);
  const termoBusca = useMemo(() => normalizar(buscaAdiada), [buscaAdiada]);

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
  const produtoPorId = useMemo(() => new Map(catalogo.map((p) => [p.id, p])), [catalogo]);
  const categoriasFiltro = useMemo(
    () => categoriasDoFiltro(aba, catalogo, lista, produtoPorId),
    [aba, catalogo, lista, produtoPorId],
  );
  const carregando = carregandoLista || carregandoCatalogo;

  const abrirProduto = useCallbackEstavel((item) => {
    const produto = catalogo.find((p) => p.id === item.produtoId);
    if (produto) selecionarProduto({ ...produto, _origemLista: true });
  });

  const removerItemPorProdutoId = useCallbackEstavel((produto) => {
    const item = lista.find((i) => i.produtoId === produto.id);
    if (item) removerItem(item);
  });

  const irParaGrupoEstavel = useCallbackEstavel(irParaGrupo);

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

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "72px", background: "var(--bg)" }}>
      <CabecalhoHome
        aba={aba}
        admin={admin}
        edicaoAdmin={edicaoAdmin}
        busca={busca}
        setBusca={setBusca}
        grupoFiltro={grupoFiltro}
        setGrupoFiltro={setGrupoFiltro}
        categoriasFiltro={categoriasFiltro}
        expandidas={aba === "catalogo" ? todasExpandidas : todasExpandidasLista}
        onAlternarExpandidas={() => aba === "catalogo"
          ? setTodasExpandidas((e) => !e)
          : setTodasExpandidasLista((e) => !e)}
        chatNaoLido={chatNaoLido}
        chatEnviando={chatEnviando}
        chatAberto={chatAberto}
        onAbrirChat={abrirChat}
        onAbrirMenu={abrirMenu}
        ordenacaoReceitas={ordenacaoReceitas}
        onAbrirOrdenacao={abrirOrdenacao}
        navReceita={navReceita}
        navDica={navDica}
        pushBack={pushBack}
        descartar={descartar}
      />

      {aba === "lista" && (
        <AbaLista
          lista={lista}
          carregando={carregando}
          erroLista={erroLista}
          erroCatalogo={erroCatalogo}
          busca={busca}
          buscaAdiada={buscaAdiada}
          termoBusca={termoBusca}
          grupoFiltro={grupoFiltro}
          itensEmCasa={itensEmCasa}
          itemPorProduto={itemPorProduto}
          produtoPorId={produtoPorId}
          agrupamentoLista={agrupamentoLista}
          mudarAgrupamento={mudarAgrupamento}
          expandidas={todasExpandidasLista}
          toggleComprado={toggleComprado}
          removerItem={removerItem}
          onAbrirProduto={abrirProduto}
          irParaGrupo={irParaGrupoEstavel}
          irParaAba={irParaAba}
          onAbrirSugestoesMes={abrirSugestoesMes}
          onAbrirMenu={abrirMenu}
        />
      )}

      {aba === "catalogo" && (
        <AbaCatalogo
          catalogo={catalogo}
          carregando={carregando}
          erroCatalogo={erroCatalogo}
          edicaoAdmin={edicaoAdmin}
          sugestoes={sugestoes}
          busca={busca}
          buscaAdiada={buscaAdiada}
          termoBusca={termoBusca}
          grupoFiltro={grupoFiltro}
          setGrupoFiltro={setGrupoFiltro}
          itemPorProduto={itemPorProduto}
          expandidas={todasExpandidas}
          adicionarItem={adicionarItem}
          alternarEmCasa={alternarEmCasa}
          onRemover={removerItemPorProdutoId}
          onAbrirProduto={selecionarProduto}
          irParaGrupo={irParaGrupoEstavel}
          onAbrirMenu={abrirMenu}
          emAndamento={emAndamento}
          rodarUmaVez={rodarUmaVez}
          avisarErro={avisarErro}
        />
      )}

      {aba === "receitas" && (
        <AbaReceitas
          navReceita={navReceita}
          receitas={receitas}
          termoBusca={termoBusca}
          ordenacaoReceitas={ordenacaoReceitas}
          itensEmCasa={itensEmCasa}
          catalogo={catalogo}
          lista={lista}
          listaAtiva={listaAtiva}
          usuario={usuario}
          admin={admin}
          edicaoAdmin={edicaoAdmin}
          adicionarItem={adicionarItem}
          adicionarItemComprado={adicionarItemComprado}
          toggleComprado={toggleComprado}
          emAndamento={emAndamento}
          rodarUmaVez={rodarUmaVez}
          pushBack={pushBack}
          voltar={voltar}
          descartar={descartar}
          trocar={trocar}
          irParaGrupo={irParaGrupo}
          irParaAba={irParaAba}
          buscarNoCatalogo={buscarNoCatalogo}
        />
      )}

      {aba === "dicas" && (
        <AbaDicas
          navDica={navDica}
          dicasApi={dicasApi}
          termoBusca={termoBusca}
          buscaAdiada={buscaAdiada}
          admin={admin}
          pushBack={pushBack}
          voltar={voltar}
          descartar={descartar}
        />
      )}

      {/* Modal detalhes */}
      {sugestoesAbertas && (
        <LimiteDeErro aoFechar={fecharSugestoesMes}>
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
        </LimiteDeErro>
      )}

      {produtoSelecionado && (
        <DetalhesProduto
          produto={catalogo.find((p) => p.id === produtoSelecionado.id) || produtoSelecionado}
          onFechar={fecharProduto}
          listaAtiva={listaAtiva}
          catalogo={catalogo}
          isAdmin={edicaoAdmin}
          origemLista={!!produtoSelecionado._origemLista}
          onDeletar={edicaoAdmin ? deletarProdutoCatalogo : undefined}
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
      {(avisoErro || avisoGravacao) && <AvisoErro mensagem={avisoErro || avisoGravacao} />}

      {/* Chat */}
      {chatAberto && <LimiteDeErro aoFechar={fecharChat}><Suspense fallback={null}><Chat onFechar={fecharChat} itensEmCasa={itensEmCasa} /></Suspense></LimiteDeErro>}

      <NavInferior
        aba={aba}
        onTrocarAba={trocarAba}
        pendentesCatalogo={edicaoAdmin ? sugestoes.pendentes.length : 0}
        pendentesReceitas={edicaoAdmin ? receitas.pendentes.length : 0}
      />

      {/* Bottom sheet ordenação receitas */}
      {ordenacaoAberta && (
        <OrdenacaoReceitas
          ordenacao={ordenacaoReceitas}
          onEscolher={setOrdenacaoReceitas}
          onFechar={fecharOrdenacao}
        />
      )}
    </div>
  );
}

export default Home;
