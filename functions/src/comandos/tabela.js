import { getFirestore } from "firebase-admin/firestore";
import { interpretarTabela } from "../parser/tabela.js";
import { encontrarMatch } from "../matching/fuzzyMatch.js";
import { criarLote, buscarLotePorId } from "../firestore/lotes.js";
import { mostrarEtapa } from "./etapasLote.js";

export async function tratarTabela(telegram, chatId, uid, texto) {
  const resultado = interpretarTabela(texto);
  if (resultado.erro) {
    await telegram.enviarMensagem(chatId, resultado.erro);
    return;
  }

  const db = getFirestore();
  const catalogoSnap = await db.collection("catalogo").get();
  const catalogo = catalogoSnap.docs.map((d) => ({ id: d.id, nome: d.data().nome }));

  const itensComMatch = resultado.itens.map((item) => ({
    ...item,
    match: encontrarMatch(item, catalogo),
  }));

  const loteId = await criarLote({
    chatId,
    uid,
    dataDaNota: resultado.data,
    mercado: resultado.mercado,
    status: "aguardando_confirmacao",
    itens: itensComMatch,
  });

  const lote = await buscarLotePorId(loteId);
  await mostrarEtapa(telegram, chatId, lote);
}
