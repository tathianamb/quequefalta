import { test } from "node:test";
import assert from "node:assert/strict";
import { dataEmCasa } from "./cardapio.js";

const ts = (iso) => ({ toDate: () => new Date(iso) });

test("dataEmCasa — usa o registro de preço mais recente da casa, não o compradoEm", () => {
  const item = { compradoEm: ts("2026-10-18T20:00:00Z") };
  const produto = {
    historico: [
      { listaAtiva: "casaA", data: ts("2026-10-10T15:00:00Z") },
      { listaAtiva: "casaA", data: ts("2026-10-15T15:00:00Z") },
      // outra casa, mais recente — não conta
      { listaAtiva: "casaB", data: ts("2026-10-17T15:00:00Z") },
    ],
  };

  assert.equal(dataEmCasa(item, produto, "casaA").toISOString(), "2026-10-15T15:00:00.000Z");
});

test("dataEmCasa — sem registro de preço da casa, cai para compradoEm", () => {
  const item = { compradoEm: ts("2026-10-18T20:00:00Z") };
  const produto = { historico: [{ listaAtiva: "casaB", data: ts("2026-10-17T15:00:00Z") }] };

  assert.equal(dataEmCasa(item, produto, "casaA").toISOString(), "2026-10-18T20:00:00.000Z");
});

test("dataEmCasa — sem nenhuma das duas datas, devolve null", () => {
  assert.equal(dataEmCasa({ compradoEm: null }, {}, "casaA"), null);
});
