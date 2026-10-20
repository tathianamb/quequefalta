import { test } from "node:test";
import assert from "node:assert/strict";
import { montarPromptPergunta, montarPromptInicial, montarPromptRefinamento } from "./prompt.js";

test("montarPromptPergunta — com pessoas, observações e itens em casa", () => {
  const entrada = {
    pessoas: [{ nome: "Tathiana", restricoes: ["sem lactose"], preferencias: ["gosta de apimentado"] }],
    observacoesGerais: "evitar carne vermelha 2x por semana",
    itensEmCasa: [{ nome: "arroz" }, { nome: "feijão" }],
    pergunta: "sobremesa rápida com o que tenho em casa",
  };
  const saida = montarPromptPergunta(entrada);

  assert.match(saida, /Tathiana \(restrições: sem lactose; preferências: gosta de apimentado\)/);
  assert.match(saida, /Observações gerais: evitar carne vermelha 2x por semana/);
  assert.match(saida, /arroz, feijão/);
  assert.match(saida, /Pergunta do usuário: "sobremesa rápida com o que tenho em casa"/);
});

test("montarPromptPergunta — sem pessoas nem itens em casa (defaults)", () => {
  const entrada = { pessoas: [], observacoesGerais: "", itensEmCasa: [], pergunta: "prato rápido com ovos" };
  const saida = montarPromptPergunta(entrada);

  assert.match(saida, /Nenhuma pessoa cadastrada ainda\./);
  assert.match(saida, /Nenhum item marcado como comprado na lista no momento/);
  assert.doesNotMatch(saida, /Observações gerais:/);
  assert.match(saida, /Pergunta do usuário: "prato rápido com ovos"/);
});

test("itens em casa — frescos/crus ordenados pelo tempo em casa, demais numa linha", () => {
  const entrada = {
    pessoas: [],
    observacoesGerais: "",
    pergunta: "o que faço hoje?",
    agora: new Date("2026-10-19T15:00:00Z"), // 12h em São Paulo
    itensEmCasa: [
      // Timestamp (cardápio salvo e relido no refinamento)
      { nome: "leite", categoria: "Laticínios", emCasaDesde: { toDate: () => new Date("2026-10-19T11:00:00Z") } },
      { nome: "arroz", categoria: "Carboidratos Secos", emCasaDesde: new Date("2026-09-01T12:00:00Z") },
      { nome: "pão", categoria: "Padaria", emCasaDesde: null },
      // 16/10 às 22h em São Paulo (já 17/10 em UTC) — conta 3 dias, não 2
      { nome: "frango", categoria: "Proteínas", emCasaDesde: new Date("2026-10-17T01:00:00Z") },
      { nome: "alface", categoria: "Hortifrúti", emCasaDesde: new Date("2026-10-13T15:00:00Z") },
    ],
  };
  const saida = montarPromptPergunta(entrada);

  assert.match(
    saida,
    /- alface \(há 6 dias em casa\)\n- frango \(há 3 dias em casa\)\n- leite \(chegou hoje\)\n- pão \(sem data de compra\)\nOutros itens: arroz/
  );
  assert.match(saida, /priorize os itens frescos\/crus que estão há mais tempo em casa/);
});

test("itens em casa — sem frescos/crus não inclui a instrução de prioridade", () => {
  const entrada = {
    pessoas: [],
    observacoesGerais: "",
    pergunta: "?",
    itensEmCasa: [{ nome: "arroz", categoria: "Carboidratos Secos", emCasaDesde: new Date() }],
  };
  const saida = montarPromptPergunta(entrada);

  assert.match(saida, /Itens disponíveis em casa:\narroz\n/);
  assert.doesNotMatch(saida, /priorize/);
});

test("montarPromptInicial — refeições customizadas", () => {
  const entrada = {
    pessoas: [{ nome: "Guilherme", restricoes: ["sem porco"] }],
    observacoesGerais: "",
    refeicoes: ["almoço", "jantar"],
    itensEmCasa: [{ nome: "frango" }],
  };
  const saida = montarPromptInicial(entrada);

  assert.match(saida, /Sugira um cardápio para o dia seguinte \(almoço, jantar\)/);
  assert.match(saida, /Guilherme \(restrições: sem porco\)/);
  assert.match(saida, /Sugira o cardápio agora\.$/);
});

test("montarPromptInicial — refeições ausentes usa default das 3 refeições", () => {
  const entrada = { pessoas: [], observacoesGerais: "", refeicoes: undefined, itensEmCasa: [] };
  const saida = montarPromptInicial(entrada);

  assert.match(saida, /Sugira um cardápio para o dia seguinte \(café da manhã, almoço e jantar\)/);
});

test("montarPromptRefinamento — histórico com geração inicial e 1 feedback", () => {
  const entrada = {
    pessoas: [{ nome: "Maria", restricoes: ["anemia"] }],
    observacoesGerais: "",
    refeicoes: ["almoço", "jantar"],
    itensEmCasa: [{ nome: "peixe" }],
    historico: [
      { tipo: "geracao_inicial", resposta: "Almoço: peixe grelhado." },
      { tipo: "feedback", feedbackUsuario: "sem peixe hoje", resposta: "Almoço: frango grelhado." },
    ],
    feedbackNovo: "algo vegetariano",
  };
  const saida = montarPromptRefinamento(entrada);

  assert.match(saida, /Sugestão inicial:\nAlmoço: peixe grelhado\./);
  assert.match(saida, /Feedback 1: "sem peixe hoje"\nNova sugestão:\nAlmoço: frango grelhado\./);
  assert.match(saida, /Novo feedback do usuário: "algo vegetariano"/);
  assert.match(saida, /Gere uma nova sugestão de cardápio incorporando esse feedback\.$/);
});

test("montarPromptRefinamento — histórico vazio", () => {
  const entrada = {
    pessoas: [],
    observacoesGerais: "",
    refeicoes: [],
    itensEmCasa: [],
    historico: [],
    feedbackNovo: "algo mais leve",
  };
  const saida = montarPromptRefinamento(entrada);

  assert.match(saida, /Histórico desta conversa até agora:\n\n/);
  assert.match(saida, /Novo feedback do usuário: "algo mais leve"/);
});
