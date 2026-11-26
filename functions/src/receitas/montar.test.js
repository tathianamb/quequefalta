import { test } from "node:test";
import assert from "node:assert/strict";
import {
  montarPromptReceita, lerRespostaReceita, montarReceita, normalizarUnidade, normalizarQuantidade,
  acharPorNome, lerCorpoComida,
} from "./montar.js";

const catalogo = [
  { id: "c1", nome: "Costela suína" }, { id: "c2", nome: "Molho barbecue" }, { id: "c3", nome: "Sal" },
  { id: "c4", nome: "Alho" }, { id: "c5", nome: "Óleo" },
];

test("prompt leva o prato, as receitas e o catálogo", () => {
  const p = montarPromptReceita({ prato: "costelinha barbecue", receitas: [{ id: "r1", nome: "Lasanha" }], catalogo });
  assert.match(p, /comi costelinha barbecue/);
  assert.match(p, /r1 \| Lasanha/);
  assert.match(p, /\nMolho barbecue\n/);
  assert.match(p, /Tire do nome qualquer pessoa/);
});

test("lê o JSON com ou sem bloco de código", () => {
  assert.deepEqual(lerRespostaReceita('```json\n{"tipo":"existente","id":"r1"}\n```'), { tipo: "existente", id: "r1" });
  assert.deepEqual(lerRespostaReceita('Aqui está: {"tipo":"nao_e_receita"} pronto'), { tipo: "nao_e_receita" });
  assert.equal(lerRespostaReceita("não sei"), null);
  assert.equal(lerRespostaReceita('{"semTipo":1}'), null);
});

test("unidade e quantidade como no formulário do app", () => {
  assert.equal(normalizarUnidade("colheres de sopa"), "cl. sopa");
  assert.equal(normalizarUnidade("ml"), "mL");
  assert.equal(normalizarUnidade("g"), "g");
  assert.equal(normalizarUnidade("punhado"), "");
  assert.equal(normalizarQuantidade("1,5"), "1.5");
  assert.equal(normalizarQuantidade("1 1/2"), "1 1/2");
  assert.equal(normalizarQuantidade("1½"), "1 1/2");
  assert.equal(normalizarQuantidade("a gosto"), null);
  assert.equal(normalizarQuantidade(200), "200");
});

test("monta a receita: casa com o catálogo, o resto fica sem cadastro", () => {
  const r = montarReceita({
    nome: "costelinha barbecue", porcoes: "4", tempoPreparo: 90,
    ingredientes: [
      { produto: "Costela suína", nome: "costelinha de porco", quantidade: "1", unidade: "quilo" },
      { produto: null, nome: "Molho barbecue", quantidade: "1", unidade: "xícara" },
      { produto: "Páprica defumada", nome: "Páprica defumada", quantidade: "1", unidade: "colher de chá" },
      { nome: "" },
    ],
    passos: ["Tempere.", "  Asse.  ", ""],
  }, catalogo);
  assert.equal(r.receita.nome, "Costelinha barbecue");
  assert.equal(r.receita.porcoes, 4);
  assert.deepEqual(r.receita.ingredientes, [
    { produtoId: "c1", nome: "Costela suína", quantidade: "1", unidade: "kg", observacao: null },
    { produtoId: "c2", nome: "Molho barbecue", quantidade: "1", unidade: "xíc.", observacao: null },
    { nomeTemp: "Páprica defumada", nome: "Páprica defumada", quantidade: "1", unidade: "cl. chá", observacao: null },
  ]);
  assert.deepEqual(r.receita.passos, ["Tempere.", "Asse."]);
  assert.deepEqual(r.semCadastro, ["Páprica defumada"]);
  assert.equal(montarReceita({ nome: "X", ingredientes: [], passos: ["a"] }, catalogo), null);
});

test("acha por nome e lê o corpo", () => {
  const receitas = [{ id: "a", nome: "Lasanha", status: "rejeitada" }, { id: "b", nome: "lasanha", status: "aprovada" }];
  assert.equal(acharPorNome(receitas, "LASANHA").id, "b");
  assert.equal(acharPorNome(receitas, "Pizza"), null);
  assert.deepEqual(lerCorpoComida({ prato: " Costelinha  barbecue ", data: "2026-11-26", mensagemId: 77 }, "2026-11-27"),
    { nome: "Costelinha barbecue", data: "2026-11-26", receitaId: null, mensagemId: "77" });
  assert.deepEqual(lerCorpoComida({ nome: "Pizza", receitaId: "abc" }, "2026-11-27"),
    { nome: "Pizza", data: "2026-11-27", receitaId: "abc", mensagemId: null });
  assert.equal(lerCorpoComida({ prato: "" }, "2026-11-27"), null);
  assert.equal(lerCorpoComida({ prato: "X", data: "2026-02-30" }, "2026-11-27"), null);
  assert.equal(lerCorpoComida({ prato: "X", receitaId: "a/b" }, "2026-11-27").receitaId, null);
});
