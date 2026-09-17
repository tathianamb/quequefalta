import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function criarSugestaoDeProduto({ nome, uid, listaAtiva }) {
  const db = getFirestore();
  const usuarioDoc = await db.collection("usuarios").doc(uid).get();
  const email = usuarioDoc.data()?.email || null;

  await db.collection("sugestoes").add({
    nome,
    categoria: "Outro",
    subcategoria: "",
    sugeridoPor: email,
    listaAtiva,
    criadoEm: FieldValue.serverTimestamp(),
    status: "pendente",
  });
}
