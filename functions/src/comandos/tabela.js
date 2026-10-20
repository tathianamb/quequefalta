import { interpretarTabela } from "../parser/tabela.js";
import { carregarCatalogoParaMatch } from "../firestore/catalogo.js";
import { encontrarMatch } from "../matching/fuzzyMatch.js";
import { criarLote, buscarLotePorId } from "../firestore/lotes.js";
import { produtoJaTemRegistro } from "../firestore/historico.js";
import { mostrarEtapa } from "./etapasLote.js";

export async function tratarTabela(telegram, chatId, uid, texto) {
  const resultado = interpretarTabela(texto);
  if (resultado.erro) {
    await telegram.enviarMensagem(chatId, resultado.erro);
    return;
  }

  const catalogo = await carregarCatalogoParaMatch();

  const itensComMatch = await Promise.all(
    resultado.itens.map(async (item) => {
      const match = encontrarMatch(item, catalogo);
      const jaRegistrado = match.melhorMatch
        ? await produtoJaTemRegistro({
            produtoId: match.melhorMatch.id,
            mercado: resultado.mercado,
            data: resultado.data,
          })
        : false;
      return { ...item, match, jaRegistrado };
    })
  );

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
