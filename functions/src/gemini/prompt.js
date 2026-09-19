function formatarPessoas(pessoas) {
  if (!pessoas?.length) return "Nenhuma pessoa cadastrada ainda.";
  return pessoas
    .map((p) => {
      const partes = [];
      if (p.restricoes?.length) partes.push(`restrições: ${p.restricoes.join(", ")}`);
      if (p.preferencias?.length) partes.push(`preferências: ${p.preferencias.join(", ")}`);
      return `- ${p.nome}${partes.length ? ` (${partes.join("; ")})` : ""}`;
    })
    .join("\n");
}

function formatarItensEmCasa(itensEmCasa) {
  if (!itensEmCasa?.length) {
    return "Nenhum item marcado como comprado na lista no momento — assuma uma despensa básica (arroz, feijão, óleo, tempero, ovos) e sugira algo simples de fazer.";
  }
  return itensEmCasa.map((i) => i.nome).join(", ");
}

function cabecalho({ pessoas, observacoesGerais, refeicoes, itensEmCasa }) {
  const refeicoesStr = refeicoes?.join(", ") || "café da manhã, almoço e jantar";
  return [
    `Você é um assistente de cardápio para uma casa no Brasil. Sugira um cardápio para o dia seguinte (${refeicoesStr}), em português, de forma direta e objetiva.`,
    "",
    "Pessoas da casa:",
    formatarPessoas(pessoas),
    "",
    observacoesGerais ? `Observações gerais: ${observacoesGerais}` : null,
    "",
    "Itens disponíveis em casa:",
    formatarItensEmCasa(itensEmCasa),
    "",
    "Você pode sugerir qualquer prato viável, não precisa se limitar apenas aos itens listados — priorize usar o que já tem em casa quando fizer sentido, mas complete com ingredientes básicos se necessário.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

export function montarPromptPergunta({ pessoas, observacoesGerais, itensEmCasa, pergunta }) {
  return [
    "Você é um assistente de cozinha para uma casa no Brasil, respondendo em português de forma direta e objetiva.",
    "",
    "Pessoas da casa:",
    formatarPessoas(pessoas),
    "",
    observacoesGerais ? `Observações gerais: ${observacoesGerais}` : null,
    "",
    "Itens disponíveis em casa:",
    formatarItensEmCasa(itensEmCasa),
    "",
    `Pergunta do usuário: "${pergunta}"`,
    "",
    "Responda diretamente à pergunta, considerando o contexto acima quando fizer sentido.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

export function montarPromptInicial({ pessoas, observacoesGerais, refeicoes, itensEmCasa }) {
  return `${cabecalho({ pessoas, observacoesGerais, refeicoes, itensEmCasa })}\n\nSugira o cardápio agora.`;
}

export function montarPromptRefinamento({ pessoas, observacoesGerais, refeicoes, itensEmCasa, historico, feedbackNovo }) {
  const rodadasAnteriores = (historico || [])
    .map((h, indice) => {
      if (h.tipo === "geracao_inicial") {
        return `Sugestão inicial:\n${h.resposta}`;
      }
      return `Feedback ${indice}: "${h.feedbackUsuario}"\nNova sugestão:\n${h.resposta}`;
    })
    .join("\n\n");

  return [
    cabecalho({ pessoas, observacoesGerais, refeicoes, itensEmCasa }),
    "",
    "Histórico desta conversa até agora:",
    rodadasAnteriores,
    "",
    `Novo feedback do usuário: "${feedbackNovo}"`,
    "",
    "Gere uma nova sugestão de cardápio incorporando esse feedback.",
  ].join("\n");
}
