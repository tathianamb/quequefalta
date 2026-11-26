import { test } from "node:test";
import assert from "node:assert/strict";
import { decidirPedido, lerCorpo, ID_VALIDO } from "./decidir.js";

const CASA = "casa1";
const p = (id, extra = {}) => ({ id, nome: id, ...extra });
const comprado = (n, casa = CASA) => Array.from({ length: n }, () => ({ listaAtiva: casa }));

test("produto comum: cria, desmarca um só, ou já está na lista", () => {
  const pao = p("pao");
  assert.deepEqual(decidirPedido(pao, [], [], CASA), { acao: "criar", produto: pao, status: "comprar" });
  const doisEmCasa = [{ id: "a", produtoId: "pao", comprado: true }, { id: "b", produtoId: "pao", comprado: true }];
  assert.deepEqual(decidirPedido(pao, [], doisEmCasa, CASA), { acao: "desmarcar", produto: pao, itemId: "a", status: "comprar" });
  const misto = [{ id: "a", produtoId: "pao", comprado: true }, { id: "b", produtoId: "pao", comprado: false }];
  assert.equal(decidirPedido(pao, [], misto, CASA).status, "ja_na_lista");
  assert.equal(decidirPedido(null, [], [], CASA).status, "nao_existe");
});

test("genérico: para comprar > em casa > mais comprada pela casa > sem pista", () => {
  const oleo = p("oleo", { generico: true, grupoSubstituicao: ["Óleo"] });
  const girassol = p("girassol", { grupoSubstituicao: ["oleo"], historico: comprado(1) });
  const soja = p("soja", { grupoSubstituicao: ["Óleo"], historico: [...comprado(3), ...comprado(9, "outra")] });
  const canola = p("canola", { grupoSubstituicao: ["Óleo"] });
  const catalogo = [oleo, girassol, soja, canola];

  // Nada na lista: a mais comprada por ESTA casa (soja 3 > girassol 1; os da outra casa não contam).
  assert.deepEqual(decidirPedido(oleo, catalogo, [], CASA), { acao: "criar", produto: soja, status: "comprar" });
  // Girassol em casa (foi o que acabou): passa a comprar.
  const emCasa = [{ id: "x", produtoId: "girassol", comprado: true }];
  assert.deepEqual(decidirPedido(oleo, catalogo, emCasa, CASA), { acao: "desmarcar", produto: girassol, itemId: "x", status: "comprar" });
  // Alguma variante já para comprar: nada.
  const jaNaLista = [...emCasa, { id: "y", produtoId: "canola", comprado: false }];
  const r = decidirPedido(oleo, catalogo, jaNaLista, CASA);
  assert.equal(r.status, "ja_na_lista");
  assert.equal(r.produto.id, "canola");
  // Sem variante com pista.
  assert.equal(decidirPedido(oleo, [oleo, canola], [], CASA).status, "generico_sem_variante");
});

test("corpo e id", () => {
  assert.deepEqual(lerCorpo({ itens: [{ produtoId: "abc", nome: "Pão" }] }), [{ produtoId: "abc", nome: "Pão" }]);
  assert.equal(lerCorpo({ itens: [] }), null);
  assert.equal(lerCorpo({ itens: Array(21).fill({ produtoId: "a" }) }), null);
  assert.equal(lerCorpo({ itens: [{ produtoId: 3 }] }), null);
  assert.equal(lerCorpo(null), null);
  assert.ok(ID_VALIDO.test("GeJHpfHi4aEDQ8f9zEnn"));
  assert.ok(!ID_VALIDO.test("a/b"));
  assert.ok(!ID_VALIDO.test("../x"));
});
