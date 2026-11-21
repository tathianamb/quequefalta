import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Datas de histórico são gravadas ao meio-dia (ver registrarPreco) justamente
// para que a conversão de volta a "YYYY-MM-DD" não vire o dia por causa de
// fuso horário — toISOString() é usado em vez de métodos locais para não
// depender do fuso do processo (Cloud Functions roda em UTC).
function paraDataIso(data) {
  const d = data?.toDate ? data.toDate() : new Date(data);
  return d.toISOString().slice(0, 10);
}

export async function produtoJaTemRegistro({ produtoId, mercado, data }) {
  const db = getFirestore();
  const doc = await db.collection("catalogo").doc(produtoId).get();
  const historico = doc.data()?.historico || [];
  return historico.some((h) => h.mercado === mercado && paraDataIso(h.data) === data);
}

// `quantidade` e `unidade` ("un" | "kg") vêm da nota; ficam fora da entrada
// quando não se sabe (registros antigos, preço digitado no app). `preco` é o
// unitário de tabela; `precoPago` (pago ÷ qtd) só existe quando houve
// desconto no item — o "onde comprar" do app usa `preco`.
export async function registrarPreco({ produtoId, mercado, preco, data, listaAtiva, nomeNota, quantidade, unidade, precoPago }) {
  const db = getFirestore();
  const dataRegistro = data ? new Date(`${data}T12:00:00`) : new Date();
  // O nome como veio na nota (nome comercial + peso/volume, ex: "Queijo Prato
  // Lanche Frimesa") ajuda a identificar a marca/variante exata depois — o
  // catálogo agrupa produtos de forma genérica (ex: "Queijo Prato"), então
  // essa informação se perderia sem ficar registrada na observação.
  const observacao = nomeNota
    ? `Registrado via Telegram — nota: "${nomeNota}"`
    : "Registrado via Telegram";

  const entrada = { mercado, preco, data: dataRegistro, observacao, listaAtiva };
  if (Number.isFinite(quantidade)) entrada.quantidade = quantidade;
  if (unidade) entrada.unidade = unidade;
  if (Number.isFinite(precoPago) && precoPago !== preco) entrada.precoPago = precoPago;
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