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

// Categorias de itens frescos/crus, que estragam em poucos dias — no prompt
// aparecem separados, do que está há mais tempo em casa para o mais recente,
// para que os pratos usem primeiro o que está para vencer.
const CATEGORIAS_PERECIVEIS = new Set(["Proteínas", "Hortifrúti", "Padaria", "Laticínios"]);

// Dia civil em São Paulo: Cloud Functions roda em UTC, e uma compra às 22h
// viraria "dia seguinte" se a conta fosse feita em UTC.
function diaEmSaoPaulo(data) {
  return data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// emCasaDesde chega como Date (direto de obterItensComprados) ou como
// Timestamp (promptContexto salvo no cardápio e relido no refinamento).
function diasEmCasa(emCasaDesde, agora) {
  const desde = emCasaDesde?.toDate ? emCasaDesde.toDate() : emCasaDesde ? new Date(emCasaDesde) : null;
  if (!desde || Number.isNaN(desde.getTime())) return null;
  const ms = Date.parse(diaEmSaoPaulo(agora)) - Date.parse(diaEmSaoPaulo(desde));
  return Math.max(0, Math.round(ms / 86400000));
}

function rotuloDias(dias) {
  if (dias === null) return "sem data de compra";
  if (dias === 0) return "chegou hoje";
  return `há ${dias} dia${dias > 1 ? "s" : ""} em casa`;
}

function formatarItensEmCasa(itensEmCasa, agora = new Date()) {
  if (!itensEmCasa?.length) {
    return "Nenhum item marcado como comprado na lista no momento — assuma uma despensa básica (arroz, feijão, óleo, tempero, ovos) e sugira algo simples de fazer.";
  }

  const pereciveis = itensEmCasa
    .filter((i) => CATEGORIAS_PERECIVEIS.has(i.categoria))
    .map((i) => ({ ...i, dias: diasEmCasa(i.emCasaDesde, agora) }))
    // Sem data vai para o fim: não dá para saber se está para estragar.
    .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));
  const outros = itensEmCasa.filter((i) => !CATEGORIAS_PERECIVEIS.has(i.categoria));

  if (!pereciveis.length) return outros.map((i) => i.nome).join(", ");

  return [
    "Frescos/crus (do que está há mais tempo em casa para o mais recente):",
    ...pereciveis.map((i) => `- ${i.nome} (${rotuloDias(i.dias)})`),
    outros.length ? `Outros itens: ${outros.map((i) => i.nome).join(", ")}` : null,
    "",
    "Ao sugerir pratos, priorize os itens frescos/crus que estão há mais tempo em casa, para usá-los antes que estraguem (considere a durabilidade de cada um).",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

const EXEMPLO_RESPOSTA = [
  "### Café da manhã",
  "- Pão com ovo mexido e fatias de mamão.",
  "",
  "### Almoço",
  "- Arroz, feijão e frango grelhado com legumes refogados.",
  "",
  "### Jantar",
  "- Sopa de legumes com torradas.",
  "",
  "### Sugestão de compra",
  "- Ovos, mamão, frango, torradas (não estavam disponíveis em casa, mas completam bem o cardápio).",
].join("\n");

// `agora` é parâmetro (padrão: data atual) só para os testes fixarem a data
// usada no "há N dias em casa".
function cabecalho({ pessoas, observacoesGerais, refeicoes, itensEmCasa, agora }) {
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
    formatarItensEmCasa(itensEmCasa, agora),
    "",
    "O cardápio deve usar apenas os itens disponíveis em casa listados acima. Se algo mais ajudaria a completar ou melhorar os pratos, não inclua no cardápio em si — liste em uma seção separada \"Sugestão de compra\" ao final.",
    "",
    "Exemplo de formato de resposta esperado (conteúdo ilustrativo, não use estas pessoas/itens):",
    "",
    EXEMPLO_RESPOSTA,
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

export function montarPromptPergunta({ pessoas, observacoesGerais, itensEmCasa, pergunta, agora }) {
  return [
    "Você é um assistente de cozinha para uma casa no Brasil, respondendo em português de forma direta e objetiva.",
    "",
    "Pessoas da casa:",
    formatarPessoas(pessoas),
    "",
    observacoesGerais ? `Observações gerais: ${observacoesGerais}` : null,
    "",
    "Itens disponíveis em casa:",
    formatarItensEmCasa(itensEmCasa, agora),
    "",
    `Pergunta do usuário: "${pergunta}"`,
    "",
    "Responda diretamente à pergunta, considerando o contexto acima quando fizer sentido.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

// Conversa do chat do app: o histórico vem do cliente (já sanitizado por
// chatApp.js) e é reenviado a cada mensagem, já que a API do Gemini aqui é
// chamada sem estado.
export function montarPromptChat({ pessoas, observacoesGerais, itensEmCasa, historico, mensagem, agora }) {
  const conversa = (historico || [])
    .map((m) => `${m.papel === "assistente" ? "Assistente" : "Usuário"}: ${m.texto}`)
    .join("\n");

  return [
    "Você é um assistente de cozinha para uma casa no Brasil, conversando em português de forma direta e objetiva. Use formatação simples: títulos com ##, listas com - e **negrito**.",
    "",
    "Pessoas da casa:",
    formatarPessoas(pessoas),
    "",
    observacoesGerais ? `Observações gerais: ${observacoesGerais}` : null,
    "",
    "Itens disponíveis em casa:",
    formatarItensEmCasa(itensEmCasa, agora),
    "",
    conversa ? `Conversa até agora:\n${conversa}\n` : null,
    `Nova mensagem do usuário: "${mensagem}"`,
    "",
    "Responda à nova mensagem, considerando o contexto acima e a conversa anterior quando fizer sentido.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

export function montarPromptInicial({ pessoas, observacoesGerais, refeicoes, itensEmCasa, agora }) {
  return `${cabecalho({ pessoas, observacoesGerais, refeicoes, itensEmCasa, agora })}\n\nSugira o cardápio agora.`;
}

export function montarPromptRefinamento({ pessoas, observacoesGerais, refeicoes, itensEmCasa, historico, feedbackNovo, agora }) {
  const rodadasAnteriores = (historico || [])
    .map((h, indice) => {
      if (h.tipo === "geracao_inicial") {
        return `Sugestão inicial:\n${h.resposta}`;
      }
      return `Feedback ${indice}: "${h.feedbackUsuario}"\nNova sugestão:\n${h.resposta}`;
    })
    .join("\n\n");

  return [
    cabecalho({ pessoas, observacoesGerais, refeicoes, itensEmCasa, agora }),
    "",
    "Histórico desta conversa até agora:",
    rodadasAnteriores,
    "",
    `Novo feedback do usuário: "${feedbackNovo}"`,
    "",
    "Gere uma nova sugestão de cardápio incorporando esse feedback.",
  ].join("\n");
}
