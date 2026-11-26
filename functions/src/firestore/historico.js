import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { jaRegistrado, mercadoCanonico, camposDaVariacao } from "../precos/variacao.js";

// Mesmo mercado e dia, e nada que diferencie (marca, tamanho; sem eles, o
// preço): regra em precos/variacao.js, a mesma do app. As datas são gravadas
// ao meio-dia (ver registrarPreco), então o dia não vira com o fuso.
export async function produtoJaTemRegistro({ produtoId, mercado, data, preco, marca, tamanho, medida, unidade }) {
  const db = getFirestore();
  const doc = await db.collection("catalogo").doc(produtoId).get();
  const historico = doc.data()?.historico || [];
  return jaRegistrado(historico, { mercado, dia: data, preco, marca, tamanho, medida, unidade });
}

// `quantidade` e `unidade` ("un" | "kg") vêm da nota; ficam fora da entrada
// quando não se sabe (registros antigos, preço digitado no app). `preco` é o
// unitário de tabela; `precoPago` (pago ÷ qtd) só existe quando houve
// desconto no item — o "onde comprar" do app usa `preco`. `marca`, `tamanho`
// e `medida` (precos/variacao.js) também só entram quando se sabe.
export async function registrarPreco({
  produtoId, mercado, preco, data, listaAtiva, nomeNota, quantidade, unidade, precoPago, marca, tamanho, medida,
}) {
  const db = getFirestore();
  const dataRegistro = data ? new Date(`${data}T12:00:00`) : new Date();
  // O nome como veio na nota (nome comercial + peso/volume, ex: "Queijo Prato
  // Lanche Frimesa") ajuda a identificar a marca/variante exata depois — o
  // catálogo agrupa produtos de forma genérica (ex: "Queijo Prato"), então
  // essa informação se perderia sem ficar registrada na observação.
  const observacao = nomeNota
    ? `Registrado via Telegram — nota: "${nomeNota}"`
    : "Registrado via Telegram";

  const entrada = { mercado: mercadoCanonico(mercado), preco, data: dataRegistro, observacao, listaAtiva };
  if (Number.isFinite(quantidade)) entrada.quantidade = quantidade;
  if (unidade) entrada.unidade = unidade;
  if (Number.isFinite(precoPago) && precoPago !== preco) entrada.precoPago = precoPago;
  Object.assign(entrada, camposDaVariacao({ marca, tamanho, medida, unidade }));
  await db
    .collection("catalogo")
    .doc(produtoId)
    .update({ historico: FieldValue.arrayUnion(entrada) });
  // Devolvido para quem precisar desfazer depois: arrayRemove exige o objeto
  // idêntico ao gravado (ver desfazerResolucaoItemRevisao).
  return entrada;
}

export async function obterListaAtivaDoUsuario(uid) {
  const db = getFirestore();
  const doc = await db.collection("usuarios").doc(uid).get();
  return doc.data()?.listaAtiva || null;
}