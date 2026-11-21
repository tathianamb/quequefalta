import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretarNota, avisoDeTotal, lerNumero, lerData } from "./nota.js";

const NOTA = `Mercado: Max
Data: 21/11/2026
Total: 77,36
item; qtd; un; unit; desc; pago
INSET RAID MAT B 6UN; 1; un; 27,59; 0; 27,59
ENERG BALY 473ML; 2; un; 5,99; 1,20; 10,78
FILEZINHO AURORA KG; 1,946; kg; 19,97; ; 38,86`;

test("formato novo: cabeçalho, títulos, desconto e pago", () => {
  const r = interpretarNota(NOTA);
  assert.equal(r.formato, "novo");
  assert.equal(r.mercado, "Max");
  assert.equal(r.data, "2026-11-21");
  assert.equal(r.totalNota, 77.36);
  assert.equal(r.somaItens, 77.23);
  assert.deepEqual(r.linhasIgnoradas, []);
  assert.equal(r.itens.length, 3);
  assert.deepEqual(r.itens[1], {
    nome: "ENERG BALY 473ML", quantidade: 2, unidade: "un", preco: 5.99, desconto: 1.2, total: 10.78, precoPago: 5.39,
  });
  assert.equal(r.itens[2].unidade, "kg");
  assert.equal(r.itens[2].quantidade, 1.946);
  assert.equal(r.itens[2].precoPago, null); // sem desconto
});

test("conferência do total", () => {
  assert.match(avisoDeTotal(interpretarNota(NOTA)), /Soma dos itens R\$ 77,23 ≠ total da nota R\$ 77,36/);
  const certo = interpretarNota(NOTA.replace("Total: 77,36", "Total: 77,25"));
  assert.equal(avisoDeTotal(certo), null); // diferença de 2 centavos: tolerada
  assert.equal(avisoDeTotal(interpretarNota(NOTA.replace("Total: 77,36\n", ""))), null);
});

test("cabeçalho em qualquer ordem e caixa, tab, sem títulos, pago e desc vazios", () => {
  const r = interpretarNota("data: 5/1/26\nMERCADO: Atacadão\nAGUA 1,5L\t6\tUN\t2,49\n");
  assert.equal(r.mercado, "Atacadão");
  assert.equal(r.data, "2026-01-05");
  assert.equal(r.totalNota, null);
  assert.deepEqual(r.itens[0], {
    nome: "AGUA 1,5L", quantidade: 6, unidade: "un", preco: 2.49, desconto: 0, total: 14.94, precoPago: null,
  });
});

test("unit vazio é calculado do pago; ponto decimal aceito", () => {
  const r = interpretarNota("Mercado: X\nData: 2026-11-21\nBANANA KG; 0.845; kg; ; ; 5.06");
  assert.equal(r.itens[0].preco, 5.99);
  assert.equal(r.itens[0].total, 5.06);
});

test("linhas repetidas somam e linhas ilegíveis são listadas", () => {
  const r = interpretarNota("Mercado: X\nData: 21/11/2026\nLEITE; 2; un; 4,99; ; 9,98\nLEITE; 1; un; 4,99; ; 4,99\nlinha estranha\nPAO; abc; un; 1; ; 1");
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].quantidade, 3);
  assert.equal(r.itens[0].total, 14.97);
  assert.deepEqual(r.linhasIgnoradas, ["linha estranha", "PAO; abc; un; 1; ; 1"]);
});

test("erros mostram o modelo", () => {
  assert.match(interpretarNota("Data: 21/11/2026\nA; 1; un; 1").erro, /Mercado[\s\S]*Modelo:/);
  assert.match(interpretarNota("Mercado: X\nData: 31/02/2026\nA; 1; un; 1").erro, /Data/);
  assert.match(interpretarNota("Mercado: X\nData: 21/11/2026").erro, /nenhum item/);
});

test("formato antigo continua aceito", () => {
  const r = interpretarNota("Max Muffato 31/08/2026\nProduto Qtd Un Preço Total\nARROZ 5KG 1 UN 24,90 24,90\nQUEIJO 0,522 kg 63,90 33,36");
  assert.equal(r.formato, "antigo");
  assert.equal(r.mercado, "Max Muffato");
  assert.equal(r.data, "2026-08-31");
  assert.equal(r.itens.length, 2);
  assert.equal(r.itens[1].quantidade, 0.522);
  assert.equal(r.somaItens, 58.26);
});

test("números", () => {
  assert.equal(lerNumero("1.234,56"), 1234.56);
  assert.equal(lerNumero("R$ 19,97"), 19.97);
  assert.equal(lerNumero(""), null);
  assert.ok(Number.isNaN(lerNumero("abc")));
  assert.equal(lerData("29/02/2027"), null);
});
