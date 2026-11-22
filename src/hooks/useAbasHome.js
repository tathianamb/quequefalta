import { useState } from "react";

/**
 * Aba ativa da Home, busca e filtro de grupos, e as trocas de aba. Recebe a
 * pilha do voltar da Home (pushBack/descartar de useBackStack) e as
 * navegações internas de receitas e dicas, que voltam à listagem quando a
 * aba muda.
 */
export function useAbasHome({ pushBack, descartar, navReceita, navDica }) {
  const [aba, setAba] = useState("lista");
  const [busca, setBusca] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState([]);

  // Atalhos entre abas (sem chave: o voltar só retorna à aba anterior).
  const irParaAba = (destino) => {
    const abaAtual = aba;
    pushBack(() => setAba(abaAtual));
    setAba(destino);
  };
  const irParaGrupo = (grupo) => {
    const abaAtual = aba;
    pushBack(() => { setAba(abaAtual); setGrupoFiltro([]); });
    setAba("catalogo");
    setBusca("");
    setGrupoFiltro([grupo]);
  };
  const buscarNoCatalogo = (nome) => {
    irParaAba("catalogo");
    setBusca(nome);
    setGrupoFiltro([]);
  };

  // Navegação inferior.
  const trocarAba = (id) => {
    if (id !== aba) {
      const abaAtual = aba;
      pushBack(() => {
        setAba(abaAtual);
        setBusca("");
        setGrupoFiltro([]);
        if (abaAtual !== "receitas") navReceita.voltarParaLista();
        if (abaAtual !== "dicas") navDica.voltarParaLista();
      });
    }
    setAba(id);
    setBusca("");
    setGrupoFiltro([]);
    // As telas internas da aba que fica para trás voltam à listagem,
    // então as entradas delas saem da pilha (depois do pushBack acima,
    // para a pilha não esvaziar no meio da troca).
    if (id !== "receitas") { navReceita.voltarParaLista(); descartar("receita"); }
    if (id !== "dicas") { navDica.voltarParaLista(); descartar("dica"); }
  };

  return {
    aba,
    busca,
    setBusca,
    grupoFiltro,
    setGrupoFiltro,
    irParaAba,
    irParaGrupo,
    buscarNoCatalogo,
    trocarAba,
  };
}
