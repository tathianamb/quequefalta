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
