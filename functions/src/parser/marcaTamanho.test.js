import { test } from "node:test";
import assert from "node:assert/strict";
import { completarMarcaETamanho, marcaNoNome, lerRespostaMarcas, faltaMarca } from "./marcaTamanho.js";

test("marca conhecida inteira no nome, a mais longa", () => {
  const marcas = ["Baly", "Dona Benta", "Max", "Ype"];
  assert.equal(marcaNoNome("ENERG BALY 473ML", marcas), "Baly");
  assert.equal(marcaNoNome("FAR TRIGO DONA BENTA 1KG", marcas), "Dona Benta");
  assert.equal(marcaNoNome("BALYX 473ML", marcas), null); // só palavra inteira
  assert.equal(marcaNoNome("QUEIJO", []), null);
});

test("ordem: coluna da nota, memória, nome", () => {
  const base = { nome: "ENERG BALY 473ML", unidade: "un" };
  const doNome = completarMarcaETamanho(base, { marcasConhecidas: ["Baly"] });
  assert.deepEqual([doNome.marca, doNome.tamanho, doNome.medida], ["Baly", 473, "ml"]);

  const daMemoria = completarMarcaETamanho(base, {
    apelido: { marca: "Baly Tradicional", tamanho: 2000, medida: "ml" },
    marcasConhecidas: ["Baly"],
  });
  assert.deepEqual([daMemoria.marca, daMemoria.tamanho], ["Baly Tradicional", 2000]);

  const daNota = completarMarcaETamanho(
    { ...base, marca: "Red Bull", tamanho: 250, medida: "ml" },
    { apelido: { marca: "Baly", tamanho: 2000, medida: "ml" } },
  );
  assert.deepEqual([daNota.marca, daNota.tamanho], ["Red Bull", 250]);

  const semMarca = completarMarcaETamanho({ ...base, semMarca: true }, { marcasConhecidas: ["Baly"] });
  assert.equal(semMarca.marca, null);
  assert.equal(semMarca.semMarca, true);
  assert.equal(faltaMarca(semMarca), false);
});

test("a peso não tem tamanho nem cobra marca", () => {
  const r = completarMarcaETamanho({ nome: "PEITO FRANGO 1KG", unidade: "kg" }, {});
  assert.equal(r.tamanho, null);
  assert.equal(faltaMarca(r), false);
  assert.equal(faltaMarca(completarMarcaETamanho({ nome: "BISC 200G", unidade: "un" }, {})), true);
});

test("resposta do 🏷️: com e sem ponto e vírgula", () => {
  const { mudancas, naoEntendidas } = lerRespostaMarcas(
    "1; Baly; 473 ml\n2 Coca Cola 2L\n3; -\n4; ; 1,5 L\n5 ninho\n6; Ypê; -\n9; X\n7; Y; muito\nlixo\n7 -",
    7,
  );
  assert.deepEqual(mudancas, [
    { indice: 0, marca: "Baly", semMarca: false, tamanho: 473, medida: "ml" },
    { indice: 1, marca: "Coca Cola", semMarca: false, tamanho: 2000, medida: "ml" },
    { indice: 2, marca: null, semMarca: true },
    { indice: 3, tamanho: 1500, medida: "ml" },
    { indice: 4, marca: "Ninho", semMarca: false },
    { indice: 5, marca: "Ypê", semMarca: false, tamanho: null, medida: null },
    { indice: 6, marca: null, semMarca: true },
  ]);
  assert.deepEqual(naoEntendidas, ["9; X", "7; Y; muito", "lixo"]);
});
