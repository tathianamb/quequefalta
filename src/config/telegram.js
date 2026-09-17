import { doc, setDoc, updateDoc, deleteField, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

const VALIDADE_CODIGO_MS = 10 * 60 * 1000;

function gerarCodigoAleatorio() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function gerarCodigoVinculo(usuario) {
  const codigo = gerarCodigoAleatorio();
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + VALIDADE_CODIGO_MS);

  await setDoc(doc(db, "codigosVinculo", codigo), {
    uid: usuario.uid,
    criadoEm: Timestamp.fromDate(agora),
    expiraEm: Timestamp.fromDate(expiraEm),
    usado: false,
  });

  return { codigo, expiraEm };
}

export async function desvincularTelegram(usuario, telegramChatId) {
  await updateDoc(doc(db, "usuarios", usuario.uid), {
    telegramChatId: deleteField(),
  });
  if (telegramChatId) {
    await updateDoc(doc(db, "telegramVinculos", telegramChatId), {
      ativo: false,
    });
  }
}
