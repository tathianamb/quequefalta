import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mercadoCanonico, chaveMercado, limparMarca, lerTamanho, extrairTamanho, formatarTamanho,
  descreverVariacao, precoPorMedida, jaRegistrado, substitui, camposDaVariacao,
} from "./variacao.js";

test("mercados equivalentes", () => {
  assert.equal(mercadoCanonico(" Max  Muffato "), "Max");
  assert.equal(mercadoCanonico("max atacadista"), "Max");
  assert.equal(mercadoCanonico("Casa Avenida"), "Avenida");
  assert.equal(mercadoCanonico("Superbom"), "Superbom");
  assert.equal(chaveMercado("ATACADÃO"), chaveMercado("atacadao"));
  assert.equal(chaveMercado("Max Muffato"), chaveMercado("Max"));
});

test("marca", () => {
  assert.equal(limparMarca("LA RUVIDA"), "La Ruvida");
  assert.equal(limparMarca("dona benta"), "Dona Benta");
  assert.equal(limparMarca("Hellmann's"), "Hellmann's");
  assert.equal(limparMarca(" - "), null);
  assert.equal(limparMarca("sem marca"), null);
  assert.equal(limparMarca(""), null);
});

test("tamanho escrito", () => {
  assert.deepEqual(lerTamanho("473 ml"), { tamanho: 473, medida: "ml" });
  assert.deepEqual(lerTamanho("1,5L"), { tamanho: 1500, medida: "ml" });
  assert.deepEqual(lerTamanho("1.5 l"), { tamanho: 1500, medida: "ml" });
  assert.deepEqual(lerTamanho("500g"), { tamanho: 500, medida: "g" });
  assert.deepEqual(lerTamanho("1 kg"), { tamanho: 1000, medida: "g" });
  assert.deepEqual(lerTamanho("1.000 g"), { tamanho: 1000, medida: "g" });
  assert.deepEqual(lerTamanho("6x200ml"), { tamanho: 1200, medida: "ml" });
  assert.deepEqual(lerTamanho("12 un"), { tamanho: 12, medida: "un" });
  assert.deepEqual(lerTamanho("30 m"), { tamanho: 30, medida: "m" });
  assert.equal(lerTamanho("muito"), null);
  assert.equal(lerTamanho("-"), null);
});

test("tamanho tirado do nome da nota", () => {
  const casos = {
    "ENERG BALY 473ML": [473, "ml"],
    "Água M Saborak 500ml": [500, "ml"],
    "AGUA 1,5L": [1500, "ml"],
    "Leite L. Vida Ninho 1L": [1000, "ml"],
    "Cereal Nestle Corn Flakes 190g": [190, "g"],
    "INSET RAID MAT B 6UN": [6, "un"],
    "PAPEL HIG NEVE 12X30M": [360, "m"],
    "KIT 2UN 500ML": [500, "ml"],
    "OVOS BRANCOS C/30": [30, "un"],
    "LEITE 1LT": [1000, "ml"],
  };
  for (const [nome, [tamanho, medida]] of Object.entries(casos)) {
    assert.deepEqual(extrairTamanho(nome), { tamanho, medida }, nome);
  }
  for (const nome of ["FILEZINHO AURORA KG", "ESPONJA SCOTCH 3M", "DESOD 48H", "QUEIJO BURITIS KG"]) {
    assert.equal(extrairTamanho(nome), null, nome);
  }
});

test("formatação", () => {
  assert.equal(formatarTamanho({ tamanho: 1500, medida: "ml" }), "1,5 L");
  assert.equal(formatarTamanho({ tamanho: 473, medida: "ml" }), "473 ml");
  assert.equal(formatarTamanho({ tamanho: 1000, medida: "g" }), "1 kg");
  assert.equal(formatarTamanho({}), "");
  assert.equal(descreverVariacao({ marca: "Baly", tamanho: 473, medida: "ml" }), "Baly · 473 ml");
  assert.equal(descreverVariacao({ marca: "Aurora", unidade: "kg", tamanho: 1000, medida: "g" }), "Aurora · a peso");
  assert.equal(descreverVariacao({}), "");
});

test("preço por medida", () => {
  const emCentavos = (p) => p && { valor: Math.round(p.valor * 100) / 100, por: p.por };
  assert.deepEqual(emCentavos(precoPorMedida({ preco: 2.39, tamanho: 1500, medida: "ml" })), { valor: 1.59, por: "L" });
  assert.deepEqual(emCentavos(precoPorMedida({ preco: 7.99, tamanho: 300, medida: "g" })), { valor: 26.63, por: "kg" });
  assert.deepEqual(emCentavos(precoPorMedida({ preco: 19.97, unidade: "kg" })), { valor: 19.97, por: "kg" });
  assert.deepEqual(emCentavos(precoPorMedida({ preco: 27.59, tamanho: 6, medida: "un" })), { valor: 4.6, por: "un" });
  assert.equal(precoPorMedida({ preco: 5 }), null);
});

const dia = (d) => ({ toDate: () => new Date(`${d}T15:00:00Z`) });

test("preço repetido", () => {
  const historico = [
    { mercado: "Max Muffato", data: dia("2026-11-21"), preco: 5.99, marca: "Baly", tamanho: 473, medida: "ml" },
    { mercado: "Atacadão", data: dia("2026-11-21"), preco: 2.39 },
  ];
  const novo = { mercado: "Max", dia: "2026-11-21", preco: 5.99, marca: "Baly", tamanho: 473, medida: "ml" };
  assert.equal(jaRegistrado(historico, novo), true); // mesmo mercado (Max = Max Muffato), tudo igual
  assert.equal(jaRegistrado(historico, { ...novo, preco: 6.49 }), true); // tudo conhecido e igual
  assert.equal(jaRegistrado(historico, { ...novo, marca: "Red Bull" }), false); // outra marca no mesmo dia
  assert.equal(jaRegistrado(historico, { ...novo, tamanho: 2000 }), false); // outro tamanho
  assert.equal(jaRegistrado(historico, { ...novo, dia: "2026-11-22" }), false);
  // Um lado sem marca/tamanho: o preço decide.
  assert.equal(jaRegistrado(historico, { mercado: "Atacadão", dia: "2026-11-21", preco: 2.39, marca: "Bulnez" }), true);
  assert.equal(jaRegistrado(historico, { mercado: "Atacadão", dia: "2026-11-21", preco: 3.89, marca: "Suprema" }), false);
  // No app (porPreco: false), outro preço no mesmo dia sem nada que diferencie também é repetido.
  assert.equal(jaRegistrado(historico, { mercado: "Atacadão", dia: "2026-11-21", preco: 3.89 }, { porPreco: false }), true);
  assert.equal(jaRegistrado(historico, { ...novo, marca: "Red Bull" }, { porPreco: false }), false);
});

test("registro novo substitui o velho que ele não contradiz", () => {
  assert.equal(substitui({ marca: "Baly", tamanho: 473, medida: "ml" }, {}), true);
  assert.equal(substitui({ marca: "Baly", tamanho: 473, medida: "ml" }, { marca: "baly" }), true);
  assert.equal(substitui({ marca: "Baly" }, { marca: "Red Bull" }), false);
  assert.equal(substitui({}, { marca: "Baly" }), false);
  assert.equal(substitui({ unidade: "kg" }, {}), true);
});

test("campos para gravar", () => {
  assert.deepEqual(camposDaVariacao({ marca: "Baly", tamanho: 473, medida: "ml" }), { marca: "Baly", tamanho: 473, medida: "ml" });
  assert.deepEqual(camposDaVariacao({ marca: null, tamanho: 1000, medida: "g", unidade: "kg" }), {});
  assert.deepEqual(camposDaVariacao({}), {});
});
