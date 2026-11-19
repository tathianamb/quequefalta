import { test } from "node:test";
import assert from "node:assert/strict";
import { montarPromptChat } from "./prompt.js";

test("montarPromptChat — itens em casa, conversa anterior e nova mensagem", () => {
  const saida = montarPromptChat({
    itensEmCasa: [{ nome: "arroz" }, { nome: "feijão" }],
    historico: [
      { papel: "usuario", texto: "o que faço no almoço?" },
      { papel: "assistente", texto: "Arroz com feijão e ovo." },
    ],
    mensagem: "e sem ovo?",
  });

  assert.match(saida, /Itens disponíveis em casa:\narroz, feijão/);
  assert.match(saida, /Conversa até agora:\nUsuário: o que faço no almoço\?\nAssistente: Arroz com feijão e ovo\./);
  assert.match(saida, /Nova mensagem do usuário: "e sem ovo\?"/);
  assert.doesNotMatch(saida, /Pessoas da casa|Observações gerais/);
});

test("montarPromptChat — sem itens em casa nem histórico (defaults)", () => {
  const saida = montarPromptChat({ itensEmCasa: [], historico: [], mensagem: "prato rápido com ovos" });

  assert.match(saida, /Nenhum item marcado como comprado na lista no momento/);
  assert.doesNotMatch(saida, /Conversa até agora/);
  assert.match(saida, /Nova mensagem do usuário: "prato rápido com ovos"/);
});
