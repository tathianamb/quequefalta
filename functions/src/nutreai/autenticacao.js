// Porta do nutreai (repositório privado tathianamb/nutreai) para o QQF:
// as funções pedirNaLista e registrarComida aceitam só quem manda o segredo
// compartilhado (Bearer). A casa vem de um secret, nunca da requisição, para
// o segredo só servir para essa casa.
import { createHash, timingSafeEqual } from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { limpar } from "../segredos.js";

export const NUTREAI_LISTA_SEGREDO = defineSecret("NUTREAI_LISTA_SEGREDO");
export const NUTREAI_CASA_UID = defineSecret("NUTREAI_CASA_UID");

// Comparação em tempo constante (os resumos têm sempre o mesmo tamanho).
function mesmoSegredo(recebido, esperado) {
  const a = createHash("sha256").update(recebido).digest();
  const b = createHash("sha256").update(esperado).digest();
  return esperado.length > 0 && timingSafeEqual(a, b);
}

/** Responde 405/401 e devolve false quando a requisição não pode seguir. */
export function autorizar(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ erro: "use POST" });
    return false;
  }
  const recebido = String(req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!mesmoSegredo(recebido, limpar(NUTREAI_LISTA_SEGREDO.value()))) {
    res.status(401).json({ erro: "não autorizado" });
    return false;
  }
  return true;
}

export const casaUid = () => limpar(NUTREAI_CASA_UID.value());
