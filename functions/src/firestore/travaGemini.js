import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Uma pergunta ao Gemini por vez por usuário, valendo para o chat do app e para
// o /pergunta do bot, com um intervalo mínimo entre perguntas. Sem isso,
// recarregar o app (ou usar outro aparelho) enquanto a função ainda faz suas
// tentativas, ou simplesmente reenviar logo depois de uma falha, multiplicava
// as requisições ao Gemini.
//   - EM_ANDAMENTO_MS: vale enquanto a pergunta roda; cobre o pior caso
//     (3 tentativas + esperas, ~50s) e serve de rede de segurança se a
//     liberação falhar.
//   - ESPERA_*: a trava continua depois do fim da pergunta, valendo tanto para
//     "tentar de novo" quanto para uma pergunta nova. Depois de uma falha a
//     espera é maior, porque quase sempre é sobrecarga do modelo e reenviar
//     na hora só gasta cota.
const EM_ANDAMENTO_MS = 75 * 1000;
const ESPERA_SUCESSO_MS = 10 * 1000;
const ESPERA_FALHA_MS = 30 * 1000;

const refDaTrava = (uid) => getFirestore().collection("travasGemini").doc(uid);

export async function adquirirTravaGemini(uid) {
  const ref = refDaTrava(uid);
  return getFirestore().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const ate = doc.data()?.ate?.toMillis() || 0;
    if (ate > Date.now()) return false;
    tx.set(ref, { ate: Timestamp.fromMillis(Date.now() + EM_ANDAMENTO_MS) });
    return true;
  });
}

export async function liberarTravaGemini(uid, { falhou = false } = {}) {
  const espera = falhou ? ESPERA_FALHA_MS : ESPERA_SUCESSO_MS;
  await refDaTrava(uid)
    .set({ ate: Timestamp.fromMillis(Date.now() + espera) })
    .catch(() => {});
}
