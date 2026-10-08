import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Uma pergunta ao Gemini por vez por usuário, valendo para o chat do app e para
// o /pergunta do bot. Sem isso, recarregar o app (ou usar outro aparelho)
// enquanto a função ainda faz suas tentativas permitia disparar outra pergunta
// em paralelo, multiplicando as requisições. A duração cobre o pior caso de
// uma pergunta (3 tentativas + esperas, ~50s) e serve de rede de segurança se
// a liberação falhar.
const DURACAO_MS = 75 * 1000;

const refDaTrava = (uid) => getFirestore().collection("travasGemini").doc(uid);

export async function adquirirTravaGemini(uid) {
  const ref = refDaTrava(uid);
  return getFirestore().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const ate = doc.data()?.ate?.toMillis() || 0;
    if (ate > Date.now()) return false;
    tx.set(ref, { ate: Timestamp.fromMillis(Date.now() + DURACAO_MS) });
    return true;
  });
}

export async function liberarTravaGemini(uid) {
  await refDaTrava(uid).delete().catch(() => {});
}
