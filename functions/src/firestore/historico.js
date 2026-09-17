import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function registrarPreco({ produtoId, mercado, preco, data, listaAtiva }) {
  const db = getFirestore();
  const dataRegistro = data ? new Date(`${data}T12:00:00`) : new Date();

  await db
    .collection("catalogo")
    .doc(produtoId)
    .update({
      historico: FieldValue.arrayUnion({
        mercado,
        preco,
        data: dataRegistro,
        observacao: "Registrado via Telegram",
        listaAtiva,
      }),
    });
}

export async function obterListaAtivaDoUsuario(uid) {
  const db = getFirestore();
  const doc = await db.collection("usuarios").doc(uid).get();
  return doc.data()?.listaAtiva || null;
}