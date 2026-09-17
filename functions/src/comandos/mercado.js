import { definirMercado, buscarLotePorId } from "../firestore/lotes.js";
import { enviarResumoParaConfirmacao } from "./resumoLote.js";

export async function tratarMercado(telegram, chatId, lote, mercado) {
  await definirMercado(lote.id, mercado);
  const loteAtualizado = await buscarLotePorId(lote.id);
  await enviarResumoParaConfirmacao(telegram, chatId, loteAtualizado);
}
