import { interpretarNota } from "../parser/nota.js";
import { completarMarcaETamanho } from "../parser/marcaTamanho.js";
import { carregarCatalogoEMarcas } from "../firestore/catalogo.js";
import { encontrarMatch } from "../matching/fuzzyMatch.js";
import { criarLote, buscarLotePorId } from "../firestore/lotes.js";
import { produtoJaTemRegistro } from "../firestore/historico.js";
import { carregarApelidos, apelidoDoNome } from "../firestore/apelidos.js";
import { aprenderSugestoesAprovadas } from "../firestore/sugestoes.js";
import { mercadoCanonico } from "../precos/variacao.js";
import { mostrarEtapa } from "./etapasLote.js";

export async function tratarTabela(telegram, chatId, uid, texto) {
  const resultado = interpretarNota(texto);
  if (resultado.erro) {
    await telegram.enviarMensagem(chatId, resultado.erro);
    return;
  }
  // "Max Muffato" e "Max" são a mesma loja (precos/variacao.js).
  const mercado = mercadoCanonico(resultado.mercado);

  // Sugestões aprovadas no app desde a última nota viram apelido antes do
  // match: a mesma nota volta a casar com o produto criado.
  await aprenderSugestoesAprovadas().catch((e) => console.error("Falha ao aprender sugestões aprovadas:", e));

  const { catalogo, marcas } = await carregarCatalogoEMarcas();
  const produtosPorId = new Map(catalogo.map((p) => [p.id, p]));
  const apelidos = await carregarApelidos(resultado.itens.map((i) => i.nome));

  const itensComMatch = await Promise.all(
    resultado.itens.map(async (itemDaNota) => {
      const apelido = apelidoDoNome(apelidos, itemDaNota.nome);
      // Marca e tamanho: colunas da nota > memória do texto > nome da nota.
      const item = completarMarcaETamanho(itemDaNota, { apelido, marcasConhecidas: marcas });
      const match = encontrarMatch(item, catalogo);
      // Memória de decisões anteriores vence o fuzzy match — desde que o
      // produto ainda exista e não seja genérico (fora de `catalogo`).
      const produtoDoApelido = apelido && produtosPorId.get(apelido.produtoId);
      if (produtoDoApelido) {
        match.melhorMatch = { id: produtoDoApelido.id, nome: produtoDoApelido.nome, score: 1, origem: "apelido" };
      }
      const jaRegistrado = match.melhorMatch
        ? await produtoJaTemRegistro({
            produtoId: match.melhorMatch.id,
            mercado,
            data: resultado.data,
            preco: item.preco,
            marca: item.marca,
            tamanho: item.tamanho,
            medida: item.medida,
            unidade: item.unidade,
          })
        : false;
      return { ...item, match, jaRegistrado };
    })
  );

  const loteId = await criarLote({
    chatId,
    uid,
    dataDaNota: resultado.data,
    mercado,
    status: "aguardando_confirmacao",
    itens: itensComMatch,
    totalNota: resultado.totalNota,
    somaItens: resultado.somaItens,
    linhasIgnoradas: resultado.linhasIgnoradas,
    formato: resultado.formato,
  });

  const lote = await buscarLotePorId(loteId);
  await mostrarEtapa(telegram, chatId, lote);
}
