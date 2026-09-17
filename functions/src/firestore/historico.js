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

export async function registrarPreco({ produtoId, mercado, preco, data, listaAtiva, nomeNota }) {
  const db = getFirestore();
  const dataRegistro = data ? new Date(`${data}T12:00:00`) : new Date();
  // O nome como veio na nota (nome comercial + peso/volume, ex: "Queijo Prato
  // Lanche Frimesa") ajuda a identificar a marca/variante exata depois — o
  // catálogo agrupa produtos de forma genérica (ex: "Queijo Prato"), então
  // essa informação se perderia sem ficar registrada na observação.
  const observacao = nomeNota
    ? `Registrado via Telegram — nota: "${nomeNota}"`
    : "Registrado via Telegram";

  await db
    .collection("catalogo")
    .doc(produtoId)
    .update({
      historico: FieldValue.arrayUnion({
        mercado,
        preco,
        data: dataRegistro,
        observacao,
        listaAtiva,
      }),
    });
}

export async function obterListaAtivaDoUsuario(uid) {
  const db = getFirestore();
  const doc = await db.collection("usuarios").doc(uid).get();
  return doc.data()?.listaAtiva || null;
}