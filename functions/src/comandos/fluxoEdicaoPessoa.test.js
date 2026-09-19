import { test } from "node:test";
import assert from "node:assert/strict";
import { criarFakeFirestore } from "./fakeFirestore.test-helper.mjs";
import { parsearLinhaPessoa } from "./menuCasa.js";

// Estes testes replicam a sequência exata observada em produção (via logs):
// /casa -> casa_pessoas -> casa_pessoa_editar:1 -> texto de resposta.
// O objetivo é isolar em qual write exatamente o aguardandoTexto se perde,
// usando as MESMAS operações de merge/dot-path que firestore/cardapio.js usa
// contra um Firestore real, mas em memória.

function atualizarMenuStateFake(doc, { tela, messageId, aguardandoTexto, refeicoesRascunho }) {
  const patch = {};
  if (tela !== undefined) patch["menuState.tela"] = tela;
  if (messageId !== undefined) patch["menuState.messageId"] = messageId;
  if (aguardandoTexto !== undefined) patch["menuState.aguardandoTexto"] = aguardandoTexto;
  if (refeicoesRascunho !== undefined) patch["menuState.refeicoesRascunho"] = refeicoesRascunho;
  return doc.set(patch, { merge: true });
}

async function atualizarPessoaFake(doc, indice, dadosPessoa) {
  const snap = await doc.get();
  const pessoas = snap.data()?.pessoas || [];
  const novasPessoas =
    indice < pessoas.length
      ? pessoas.map((p, i) => (i === indice ? dadosPessoa : p))
      : [...pessoas, dadosPessoa];
  await doc.set({ pessoas: novasPessoas }, { merge: true });
}

test("fluxo completo: abrir /casa, ir a pessoas, editar índice 1, responder texto — deve salvar", async () => {
  const db = criarFakeFirestore({
    uid1: {
      pessoas: [
        { nome: "Tathiana", restricoes: ["sem lactose"], preferencias: [] },
        { nome: "Guilherme", restricoes: ["sem porco"], preferencias: [] },
        { nome: "Maria", restricoes: ["anemia"], preferencias: [] },
      ],
      horarioEnvio: "21:00",
      refeicoes: ["café da manhã", "almoço"],
      observacoesGerais: "",
    },
  });
  const doc = db.collection("perfilCasa").doc("uid1");

  // Passo 1: /casa -> abrirMenuPrincipal
  await atualizarMenuStateFake(doc, { tela: "principal", messageId: 100, aguardandoTexto: null });

  // Passo 2: casa_pessoas -> abrirTelaPessoas
  await atualizarMenuStateFake(doc, { tela: "pessoas", messageId: 100 });

  // Passo 3: casa_pessoa_editar:1 -> pedirTextoPessoa(uid, 1, messageId=100)
  await atualizarMenuStateFake(doc, {
    aguardandoTexto: { tipo: "pessoa_editar", indice: 1, messageIdPergunta: 200 },
    messageId: 100,
  });

  // Passo 4: texto chega -> webhook lê perfil e checa aguardandoTexto
  const snapAntesDoTexto = await doc.get();
  const perfilLido = snapAntesDoTexto.data();
  assert.ok(perfilLido.menuState?.aguardandoTexto, "aguardandoTexto deveria estar setado antes do texto chegar");
  assert.equal(perfilLido.menuState.aguardandoTexto.indice, 1);

  // Passo 5: processarTextoAguardado
  const textoUsuario = "Guilherme: sem porco, sem chuchu, sem berinjela, sem pepino, sem milho, sem abobrinha, sem abóbora";
  const dadosPessoa = parsearLinhaPessoa(textoUsuario);
  await atualizarPessoaFake(doc, perfilLido.menuState.aguardandoTexto.indice, dadosPessoa);

  const snapFinal = await doc.get();
  const pessoaFinal = snapFinal.data().pessoas[1];
  assert.equal(pessoaFinal.nome, "Guilherme");
  assert.deepEqual(pessoaFinal.restricoes, [
    "sem porco", "sem chuchu", "sem berinjela", "sem pepino", "sem milho", "sem abobrinha", "sem abóbora",
  ]);
});

test("atualizarMenuState com dot-path não apaga aguardandoTexto de escrita anterior", async () => {
  const db = criarFakeFirestore({ uid1: {} });
  const doc = db.collection("perfilCasa").doc("uid1");

  await atualizarMenuStateFake(doc, { aguardandoTexto: { tipo: "pessoa_editar", indice: 1, messageIdPergunta: 200 } });
  // Uma segunda escrita que só toca messageId não deveria apagar aguardandoTexto
  await atualizarMenuStateFake(doc, { messageId: 999 });

  const snap = await doc.get();
  assert.ok(snap.data().menuState.aguardandoTexto, "aguardandoTexto não deveria ter sido apagado");
  assert.equal(snap.data().menuState.messageId, 999);
});

test("atualizarPessoa com índice de pessoa removida anteriormente (array encolheu)", async () => {
  const db = criarFakeFirestore({
    uid1: {
      pessoas: [
        { nome: "Tathiana", restricoes: [], preferencias: [] },
        { nome: "Maria", restricoes: [], preferencias: [] },
      ],
    },
  });
  const doc = db.collection("perfilCasa").doc("uid1");

  // Simula editar índice 1 (que era "Guilherme" antes de ser removido, agora é "Maria")
  const dadosPessoa = parsearLinhaPessoa("Guilherme: sem porco");
  await atualizarPessoaFake(doc, 1, dadosPessoa);

  const snap = await doc.get();
  // Índice 1 agora é sobrescrito com os dados de "Guilherme" em cima de "Maria" —
  // demonstra que um índice obtido ANTES de uma remoção fica inválido depois.
  assert.equal(snap.data().pessoas[1].nome, "Guilherme");
  assert.equal(snap.data().pessoas.length, 2, "não deveria ter incluído uma pessoa nova, só sobrescrito por engano");
});
