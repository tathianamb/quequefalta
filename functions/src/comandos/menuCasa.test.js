import { test } from "node:test";
import assert from "node:assert/strict";
import { parsearLinhaPessoa } from "./menuCasa.js";

test("parsearLinhaPessoa — separador ponto-e-vírgula", () => {
  const resultado = parsearLinhaPessoa("Tathiana: sem lactose; gosta de apimentado");
  assert.deepEqual(resultado, {
    nome: "Tathiana",
    restricoes: ["sem lactose", "gosta de apimentado"],
    preferencias: [],
  });
});

test("parsearLinhaPessoa — separador vírgula, texto real do usuário", () => {
  const resultado = parsearLinhaPessoa(
    "Guilherme: sem porco, sem chuchu, sem berinjela, sem pepino, sem milho, sem abobrinha, sem abóbora"
  );
  assert.deepEqual(resultado, {
    nome: "Guilherme",
    restricoes: [
      "sem porco",
      "sem chuchu",
      "sem berinjela",
      "sem pepino",
      "sem milho",
      "sem abobrinha",
      "sem abóbora",
    ],
    preferencias: [],
  });
});

test("parsearLinhaPessoa — sem dois-pontos, texto vira só o nome", () => {
  const resultado = parsearLinhaPessoa("Maria");
  assert.deepEqual(resultado, { nome: "Maria", restricoes: [], preferencias: [] });
});

test("parsearLinhaPessoa — restrições vazias após dois-pontos", () => {
  const resultado = parsearLinhaPessoa("Pedro:   ");
  assert.deepEqual(resultado, { nome: "Pedro", restricoes: [], preferencias: [] });
});
