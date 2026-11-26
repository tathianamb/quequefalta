// registrarComida: quando a Tathiana diz ao bot do nutreai "comi X", o
// nutreai chama esta função com o nome do prato. Ela:
//   - acha a receita no app (receitaId, nome igual sem acento/caixa, ou o
//     Gemini reconhece o prato entre as existentes) e anota a data em
//     comidaEm (o "comemos", que o app mostra e usa para ordenar sugestões);
//   - senão, o Gemini pesquisa na web uma receita real (busca do Google), que
//     é casada com o catálogo e gravada PENDENTE: aparece só para os admins
//     até alguém aprovar no app.
//
//   POST, Authorization: Bearer <NUTREAI_LISTA_SEGREDO>
//   { "prato" | "nome": "Costelinha barbecue", "data"?: "aaaa-mm-dd", "receitaId"?, "mensagemId"? }
//   → 200 { status: ja_existe | criada | rejeitada | nao_e_receita, receitaId, nome, statusReceita, ingredientesSemCadastro }
//   400 corpo inválido, 401 segredo errado, 405 método, 502 o Gemini falhou (tentar de novo depois).
//
// O texto que ela escreveu não é guardado (pode citar pessoas); receitas são
// legíveis por qualquer conta logada do app. Regras puras em receitas/montar.js.
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { NUTREAI_LISTA_SEGREDO, NUTREAI_CASA_UID, autorizar, casaUid } from "./nutreai/autenticacao.js";
import { limpar } from "./segredos.js";
import { criarClienteGemini } from "./gemini/api.js";
import { montarPromptReceita, lerRespostaReceita, montarReceita, acharPorNome, lerCorpoComida } from "./receitas/montar.js";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Dia de hoje no Brasil (aaaa-mm-dd), para quando o nutreai não manda a data.
const hojeEmSaoPaulo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

async function anotarComida(db, receita, data) {
  if (receita.status === "rejeitada") {
    return { status: "rejeitada", receitaId: receita.id, nome: receita.nome, statusReceita: null, ingredientesSemCadastro: [] };
  }
  // arrayUnion: a mesma data duas vezes fica uma só (chamada repetida não duplica).
  await db.collection("receitas").doc(receita.id).update({ comidaEm: FieldValue.arrayUnion(data) });
  return { status: "ja_existe", receitaId: receita.id, nome: receita.nome, statusReceita: receita.status, ingredientesSemCadastro: [] };
}

class ErroGemini extends Error {}

async function registrar(pedido) {
  const db = getFirestore();
  const receitas = (await db.collection("receitas").get()).docs.map((d) => ({ id: d.id, ...d.data() }));

  const porId = pedido.receitaId && receitas.find((r) => r.id === pedido.receitaId);
  const existente = porId || acharPorNome(receitas, pedido.nome);
  if (existente) return anotarComida(db, existente, pedido.data);

  const catalogo = (await db.collection("catalogo").get()).docs.map((d) => ({ id: d.id, nome: d.data().nome }));
  const gemini = criarClienteGemini(limpar(GEMINI_API_KEY.value()), { modeloReserva: "gemini-3.5-flash-lite" });
  let resposta;
  try {
    resposta = await gemini.pesquisar(montarPromptReceita({
      prato: pedido.nome,
      receitas: receitas.filter((r) => r.status !== "rejeitada").map(({ id, nome }) => ({ id, nome })),
      catalogo,
    }));
  } catch (e) {
    throw new ErroGemini(e.message);
  }
  const lida = lerRespostaReceita(resposta.texto);
  if (!lida) throw new ErroGemini("resposta do Gemini sem JSON");

  if (lida.tipo === "existente") {
    const receita = receitas.find((r) => r.id === lida.id);
    if (receita) return anotarComida(db, receita, pedido.data);
  }
  if (lida.tipo === "nao_e_receita") {
    return { status: "nao_e_receita", receitaId: null, nome: pedido.nome, statusReceita: null, ingredientesSemCadastro: [] };
  }
  const montada = lida.tipo === "nova" ? montarReceita(lida.receita, catalogo) : null;
  if (!montada) throw new ErroGemini(`receita incompleta (tipo ${lida.tipo})`);

  // O nome do Gemini pode bater com uma receita existente: não duplica.
  const mesmoNome = acharPorNome(receitas, montada.receita.nome);
  if (mesmoNome) return anotarComida(db, mesmoNome, pedido.data);

  const fonte = resposta.fontes[0] || null;
  const ref = await db.collection("receitas").add({
    ...montada.receita,
    foto: null,
    status: "pendente",
    origem: "nutreai",
    fonte,
    mensagemId: pedido.mensagemId,
    comidaEm: [pedido.data],
    criadaPor: casaUid(),
    criadaEm: FieldValue.serverTimestamp(),
  });
  return {
    status: "criada",
    receitaId: ref.id,
    nome: montada.receita.nome,
    statusReceita: "pendente",
    ingredientesSemCadastro: montada.semCadastro,
  };
}

export const registrarComida = onRequest(
  {
    region: "southamerica-east1",
    secrets: [NUTREAI_LISTA_SEGREDO, NUTREAI_CASA_UID, GEMINI_API_KEY],
    timeoutSeconds: 300,
    memory: "256MiB",
    maxInstances: 1,
  },
  async (req, res) => {
    if (!autorizar(req, res)) return;
    const pedido = lerCorpoComida(req.body, hojeEmSaoPaulo());
    if (!pedido) {
      res.status(400).json({ erro: 'corpo esperado: { "prato": "...", "data"?: "aaaa-mm-dd", "receitaId"?: "..." }' });
      return;
    }
    try {
      res.status(200).json(await registrar(pedido));
    } catch (e) {
      console.error("registrarComida:", e);
      if (e instanceof ErroGemini) res.status(502).json({ erro: "não consegui montar a receita agora" });
      else res.status(500).json({ erro: "falha ao gravar" });
    }
  },
);
