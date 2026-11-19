function formatarItensEmCasa(itensEmCasa) {
  if (!itensEmCasa?.length) {
    return "Nenhum item marcado como comprado na lista no momento — assuma uma despensa básica (arroz, feijão, óleo, tempero, ovos) e sugira algo simples de fazer.";
  }
  return itensEmCasa.map((i) => i.nome).join(", ");
}

// Conversa do chat do app: o histórico vem do cliente (já sanitizado por
// chatApp.js) e é reenviado a cada mensagem, já que a API do Gemini aqui é
// chamada sem estado. O único contexto da casa são os itens em casa.
export function montarPromptChat({ itensEmCasa, historico, mensagem }) {
  const conversa = (historico || [])
    .map((m) => `${m.papel === "assistente" ? "Assistente" : "Usuário"}: ${m.texto}`)
    .join("\n");

  return [
    "Você é um assistente de cozinha para uma casa no Brasil, conversando em português de forma direta e objetiva. Use formatação simples: títulos com ##, listas com - e **negrito**.",
    "",
    "Itens disponíveis em casa:",
    formatarItensEmCasa(itensEmCasa),
    "",
    conversa ? `Conversa até agora:\n${conversa}\n` : null,
    `Nova mensagem do usuário: "${mensagem}"`,
    "",
    "Responda à nova mensagem, considerando o contexto acima e a conversa anterior quando fizer sentido.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}
