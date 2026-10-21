import { createHash, timingSafeEqual } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { buscarPerfilCasa, obterItensComprados } from "./firestore/cardapio.js";

const JORNAL_TOKEN = defineSecret("JORNAL_TOKEN");
const JORNAL_UID = defineSecret("JORNAL_UID");

// Mesmo saneamento dos outros secrets: o CLI no Windows grava \r\n no fim.
const limpar = (valor) => valor.trim();

// Compara em tempo constante (via hash, para os dois lados terem o mesmo
// tamanho) para o tempo de resposta não vazar quanto do token bate.
function tokenValido(recebido, esperado) {
  const hash = (texto) => createHash("sha256").update(texto).digest();
  return timingSafeEqual(hash(recebido), hash(esperado));
}

// Despensa para o jornal O Matutino (repo news-ai): o robô de coleta das 6h
// chama esta URL e guarda só o necessário para sugerir a receita do dia.
// Nomes das pessoas e o resto do perfil da casa não saem daqui.
export const despensaJornal = onRequest(
  {
    region: "southamerica-east1",
    secrets: [JORNAL_TOKEN, JORNAL_UID],
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("use GET");
      return;
    }
    if (!tokenValido(req.get("Authorization") || "", `Bearer ${limpar(JORNAL_TOKEN.value())}`)) {
      res.status(401).send("token inválido");
      return;
    }
    try {
      const uid = limpar(JORNAL_UID.value());
      const [perfil, itens] = await Promise.all([buscarPerfilCasa(uid), obterItensComprados(uid)]);
      res.json({
        atualizadoEm: new Date().toISOString(),
        itens, // [{ nome, categoria, emCasaDesde }] — emCasaDesde é Date (vira ISO no JSON) ou null
        observacoesGerais: perfil?.observacoesGerais || "",
      });
    } catch (erro) {
      console.error("Erro na despensa do jornal:", erro);
      res.status(500).send("erro");
    }
  }
);
