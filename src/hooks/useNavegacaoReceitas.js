import { useState } from "react";

/**
 * Sub-navegação da aba Receitas (lista / detalhe / texto / formulario).
 * Fica na Home, e não na aba, porque o cabeçalho lê a tela atual e a
 * navegação inferior volta tudo à listagem; e o texto colado sobrevive à
 * troca de aba, como antes.
 */
export function useNavegacaoReceitas(receitasAprovadas) {
  // Guarda o id (não a cópia): se a receita for editada ou rejeitada por outro
  // admin, o detalhe acompanha, como nas dicas.
  const [receitaSelecionadaId, setReceitaSelecionadaId] = useState(null);
  const [telaReceita, setTelaReceita] = useState("lista"); // "lista" | "detalhe" | "texto" | "formulario"
  const [textoReceita, setTextoReceita] = useState("");
  const [dadosParseados, setDadosParseados] = useState(null);
  const [receitaEditando, setReceitaEditando] = useState(null); // receita pendente sendo editada

  const receitaSelecionada = receitasAprovadas.find((r) => r.id === receitaSelecionadaId) ?? null;
  // Se a receita aberta sumir (rejeitada ou editada para pendente), volta pra lista.
  const telaReceitaEfetiva = telaReceita === "detalhe" && !receitaSelecionada ? "lista" : telaReceita;

  // Volta à listagem e esquece a receita aberta (sem mexer na pilha do voltar).
  const voltarParaLista = () => {
    setReceitaSelecionadaId(null);
    setTelaReceita("lista");
  };

  return {
    telaReceita,
    setTelaReceita,
    telaReceitaEfetiva,
    receitaSelecionada,
    setReceitaSelecionadaId,
    textoReceita,
    setTextoReceita,
    dadosParseados,
    setDadosParseados,
    receitaEditando,
    setReceitaEditando,
    voltarParaLista,
  };
}
