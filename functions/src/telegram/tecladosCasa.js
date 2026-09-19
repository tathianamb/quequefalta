const REFEICOES = ["café da manhã", "almoço", "jantar"];
const HORARIOS = ["19", "20", "21", "22", "23"];

export function tecladoMenuPrincipal() {
  return {
    inline_keyboard: [
      [{ text: "👨‍👩‍👧 Pessoas", callback_data: "casa_pessoas" }],
      [{ text: "🕒 Horário", callback_data: "casa_horario" }],
      [{ text: "🍽️ Refeições", callback_data: "casa_refeicoes" }],
      [{ text: "📝 Observações", callback_data: "casa_observacoes" }],
    ],
  };
}

export function tecladoPessoas(pessoas) {
  const linhasPessoas = (pessoas || []).map((p, indice) => [
    { text: `✏️ ${p.nome}`, callback_data: `casa_pessoa_editar:${indice}` },
    { text: "🗑️", callback_data: `casa_pessoa_remover:${indice}` },
  ]);
  return {
    inline_keyboard: [
      ...linhasPessoas,
      [{ text: "➕ Incluir pessoa", callback_data: "casa_pessoa_incluir" }],
      [{ text: "⬅️ Voltar", callback_data: "casa_menu" }],
    ],
  };
}

export function tecladoHorarios() {
  return {
    inline_keyboard: [
      HORARIOS.map((hh) => ({ text: `${hh}:00`, callback_data: `casa_horario_set:${hh}` })),
      [{ text: "⬅️ Voltar", callback_data: "casa_menu" }],
    ],
  };
}

// refeicoesRascunho é o estado em edição (toggle antes de confirmar) — o
// texto do botão reflete se a refeição está marcada nesse rascunho, não em
// perfil.refeicoes diretamente.
export function tecladoRefeicoes(refeicoesRascunho) {
  const botoesRefeicoes = REFEICOES.map((refeicao, indice) => ({
    text: `${(refeicoesRascunho || []).includes(refeicao) ? "✅" : "⬜"} ${refeicao}`,
    callback_data: `casa_refeicao_toggle:${indice}`,
  }));
  return {
    inline_keyboard: [
      ...botoesRefeicoes.map((b) => [b]),
      [{ text: "✅ Confirmar", callback_data: "casa_refeicoes_confirmar" }],
      [{ text: "⬅️ Voltar", callback_data: "casa_menu" }],
    ],
  };
}

export { REFEICOES };
