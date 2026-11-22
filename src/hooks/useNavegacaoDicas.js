import { useState } from "react";

/**
 * Sub-navegação da aba Dicas (lista / detalhe / formulario). Fica na Home
 * pelo mesmo motivo da de receitas: o cabeçalho lê a tela atual e a
 * navegação inferior volta tudo à listagem.
 */
export function useNavegacaoDicas(dicas) {
  const [telaDica, setTelaDica] = useState("lista"); // "lista" | "detalhe" | "formulario"
  const [dicaSelecionadaId, setDicaSelecionadaId] = useState(null);
  const [editandoDica, setEditandoDica] = useState(false); // formulário edita a dica selecionada (senão cria nova)

  const dicaSelecionada = dicas.find((d) => d.id === dicaSelecionadaId) ?? null;
  // Se a dica aberta sumir (excluída aqui ou por outro admin), volta pra lista.
  const telaDicaEfetiva =
    (telaDica === "detalhe" || (telaDica === "formulario" && editandoDica)) && !dicaSelecionada
      ? "lista"
      : telaDica;

  // Volta à listagem e esquece a dica aberta (sem mexer na pilha do voltar).
  const voltarParaLista = () => {
    setDicaSelecionadaId(null);
    setTelaDica("lista");
  };

  return {
    setTelaDica,
    telaDicaEfetiva,
    dicaSelecionada,
    setDicaSelecionadaId,
    editandoDica,
    setEditandoDica,
    voltarParaLista,
  };
}
