import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function resolverUidPorChatId(chatId) {
  const db = getFirestore();
  const doc = await db.collection("telegramVinculos").doc(String(chatId)).get();
  if (!doc.exists || doc.data().ativo === false) return null;
  return doc.data().uid;
}

export async function vincularChatComCodigo(chatId, codigo) {
  const db = getFirestore();
  const codigoRef = db.collection("codigosVinculo").doc(codigo);

  return db.runTransaction(async (tx) => {
    const codigoDoc = await tx.get(codigoRef);
    if (!codigoDoc.exists) {
      return { sucesso: false, motivo: "codigo_invalido" };
    }

    const dados = codigoDoc.data();
    if (dados.usado) {
      return { sucesso: false, motivo: "codigo_ja_usado" };
    }
    if (dados.expiraEm.toDate() < new Date()) {
      return { sucesso: false, motivo: "codigo_expirado" };
    }

    const vinculoRef = db.collection("telegramVinculos").doc(String(chatId));
    const usuarioRef = db.collection("usuarios").doc(dados.uid);

    tx.set(vinculoRef, {
      uid: dados.uid,
      vinculadoEm: FieldValue.serverTimestamp(),
      ativo: true,
    });
    tx.update(usuarioRef, { telegramChatId: String(chatId) });
    tx.update(codigoRef, { usado: true });

    return { sucesso: true, uid: dados.uid };
  });
}
