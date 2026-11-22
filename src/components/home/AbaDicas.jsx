import { Suspense } from "react";
import { DicaLista } from "../dicas/DicaLista";
import { DicaDetalhe } from "../dicas/DicaDetalhe";
import { filtrarDicas } from "../../utils/listagens";
import { lazyComNovaTentativa } from "../../utils/lazy";
import LimiteDeErro from "../LimiteDeErro";

// Tela rara: fica fora do pacote de abertura (carrega na primeira vez).
const DicaFormulario = lazyComNovaTentativa(() => import("../dicas/DicaFormulario").then((m) => ({ default: m.DicaFormulario })));

/**
 * Aba Dicas com a sub-navegação lista / detalhe / formulario. O estado da
 * navegação (navDica) é da Home (useNavegacaoDicas); `dicasApi` é o retorno
 * de useDicas. pushBack/voltar/descartar chegam da Home, com a chave "dica".
 */
export default function AbaDicas({
  navDica,
  dicasApi,
  termoBusca,
  buscaAdiada,
  admin,
  pushBack,
  voltar,
  descartar,
}) {
  const {
    setTelaDica,
    telaDicaEfetiva,
    dicaSelecionada,
    setDicaSelecionadaId,
    editandoDica,
    setEditandoDica,
    voltarParaLista,
  } = navDica;
  const dicasFiltradas = filtrarDicas(dicasApi.dicas, termoBusca);

  return (
    <div style={{ padding: "20px 16px 96px" }}>
      {telaDicaEfetiva === "lista" && (
        <DicaLista
          dicas={dicasFiltradas}
          carregando={dicasApi.carregando}
          erro={dicasApi.erro}
          busca={buscaAdiada}
          onVerDica={(d) => {
            setDicaSelecionadaId(d.id);
            setTelaDica("detalhe");
            pushBack(voltarParaLista, "dica");
          }}
        />
      )}
      {telaDicaEfetiva === "detalhe" && (
        <DicaDetalhe
          dica={dicaSelecionada}
          isAdmin={admin}
          onVoltar={() => voltar(voltarParaLista)}
          onEditar={() => {
            setEditandoDica(true);
            setTelaDica("formulario");
            pushBack(() => setTelaDica("detalhe"), "dica");
          }}
        />
      )}
      {telaDicaEfetiva === "formulario" && (
        <LimiteDeErro>
        <Suspense fallback={null}>
        <DicaFormulario
          key={editandoDica ? dicaSelecionada.id : "nova"}
          dicaInicial={editandoDica ? dicaSelecionada : null}
          onVoltar={() => voltar(() => setTelaDica(editandoDica ? "detalhe" : "lista"))}
          onSalvar={async (dados) => {
            if (editandoDica) {
              await dicasApi.atualizar(dicaSelecionada, dados);
            } else {
              await dicasApi.criar(dados);
            }
            // Salvou: volta uma tela (edição → detalhe; nova → lista),
            // tirando o formulário da pilha.
            voltar(() => setTelaDica(editandoDica ? "detalhe" : "lista"));
          }}
          onExcluir={async () => {
            await dicasApi.deletar(dicaSelecionada);
            voltarParaLista();
            descartar("dica");
          }}
        />
        </Suspense>
        </LimiteDeErro>
      )}
    </div>
  );
}
