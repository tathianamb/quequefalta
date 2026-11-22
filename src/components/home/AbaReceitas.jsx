import { useMemo, Suspense } from "react";
import { ReceitaLista } from "../receitas/ReceitaLista";
import { ReceitaDetalhe } from "../receitas/ReceitaDetalhe";
import ReceitasPendentesAdmin from "./ReceitasPendentesAdmin";
import { sugerirProduto } from "../../config/sugestoes";
import { escolherVariante } from "../../utils/ingredientesEmCasa";
import { ordenarReceitas } from "../../utils/listagens";
import { lazyComNovaTentativa } from "../../utils/lazy";
import LimiteDeErro from "../LimiteDeErro";

// Telas raras: ficam fora do pacote de abertura e carregam na primeira vez que
// são abertas (o service worker já deixa os arquivos em cache).
const ReceitaTexto = lazyComNovaTentativa(() => import("../receitas/ReceitaTexto").then((m) => ({ default: m.ReceitaTexto })));
const ReceitaFormulario = lazyComNovaTentativa(() => import("../receitas/ReceitaFormulario").then((m) => ({ default: m.ReceitaFormulario })));

/**
 * Aba Receitas com a sub-navegação lista / detalhe / texto / formulario.
 * O estado da navegação (navReceita) é da Home (useNavegacaoReceitas);
 * `receitas` é o retorno de useReceitas. A pilha do voltar também é da Home:
 * pushBack/voltar/descartar/trocar chegam por props, sempre com a chave "receita".
 */
export default function AbaReceitas({
  navReceita,
  receitas,
  termoBusca,
  ordenacaoReceitas,
  itensEmCasa,
  catalogo,
  lista,
  listaAtiva,
  usuario,
  admin,
  edicaoAdmin,
  adicionarItem,
  adicionarItemComprado,
  toggleComprado,
  emAndamento,
  rodarUmaVez,
  pushBack,
  voltar,
  descartar,
  trocar,
  irParaGrupo,
  irParaAba,
  buscarNoCatalogo,
}) {
  const {
    telaReceitaEfetiva,
    setTelaReceita,
    receitaSelecionada,
    setReceitaSelecionadaId,
    textoReceita,
    setTextoReceita,
    dadosParseados,
    setDadosParseados,
    receitaEditando,
    setReceitaEditando,
    voltarParaLista,
  } = navReceita;

  // Receitas e quantos ingredientes faltam em cada uma (utils/listagens.js).
  const { receitasFiltradas, faltam } = useMemo(
    () => ordenarReceitas(receitas.aprovadas, termoBusca, itensEmCasa, catalogo, ordenacaoReceitas),
    [receitas.aprovadas, termoBusca, itensEmCasa, catalogo, ordenacaoReceitas],
  );

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

  return (
    <div style={{ padding: "20px 16px 96px" }}>
      {edicaoAdmin && receitas.pendentes.length > 0 && telaReceitaEfetiva === "lista" && (
        <ReceitasPendentesAdmin
          pendentes={receitas.pendentes}
          onEditar={(r) => {
            setReceitaEditando(r);
            setDadosParseados(r);
            setTelaReceita("formulario");
            pushBack(() => { setReceitaEditando(null); setDadosParseados(null); setTelaReceita("lista"); }, "receita");
          }}
          aprovar={receitas.aprovar}
          rejeitar={receitas.rejeitar}
          emAndamento={emAndamento}
          rodarUmaVez={rodarUmaVez}
        />
      )}
      {telaReceitaEfetiva === "lista" && (
        <ReceitaLista
          receitas={receitasFiltradas}
          carregando={receitas.carregando}
          erro={receitas.erro}
          faltam={faltam}
          onVerReceita={(r) => { setReceitaSelecionadaId(r.id); setTelaReceita("detalhe"); pushBack(voltarParaLista, "receita"); }}
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
          onVoltar={() => voltar(voltarParaLista)}
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
            voltarParaLista();
            descartar("receita");
            if (grupoParaEscolher) { irParaGrupo(grupoParaEscolher); return; }
            irParaAba("lista");
          }}
          onBuscarIngrediente={(nome) => {
            voltarParaLista();
            descartar("receita");
            buscarNoCatalogo(nome);
          }}
        />
      )}
      {telaReceitaEfetiva === "texto" && (
        <LimiteDeErro>
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
        </LimiteDeErro>
      )}
      {telaReceitaEfetiva === "formulario" && (
        <LimiteDeErro>
        <Suspense fallback={null}>
        <ReceitaFormulario
          catalogo={catalogo}
          isAdmin={edicaoAdmin}
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
              await receitas.atualizar(receitaEditando, dados);
            } else {
              await receitas.sugerir(dados);
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
        </LimiteDeErro>
      )}
    </div>
  );
}
