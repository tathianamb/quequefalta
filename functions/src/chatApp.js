import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { criarClienteGemini } from "./gemini/api.js";
import { montarPromptChat } from "./gemini/prompt.js";
import { mensagemDeErro } from "./gemini/erros.js";
import { buscarPerfilCasa, obterItensComprados } from "./firestore/cardapio.js";
import { adquirirTravaGemini, liberarTravaGemini } from "./firestore/travaGemini.js";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const MAX_MENSAGEM = 1000;
const MAX_TURNOS_HISTORICO = 10;
const MAX_TEXTO_HISTORICO = 4000;

// O histórico vem do cliente, então nunca é confiável: só aceita papéis
// conhecidos, corta o tamanho e limita a quantidade de turnos para o prompt
// não crescer sem controle (nem virar canal de injeção de campos extras).
export function sanitizarHistorico(historico) {
  if (!Array.isArray(historico)) return [];
  return historico
    .filter((m) => m && (m.papel === "usuario" || m.papel === "assistente") && typeof m.texto === "string")
    .map((m) => ({ papel: m.papel, texto: m.texto.slice(0, MAX_TEXTO_HISTORICO) }))
    .slice(-MAX_TURNOS_HISTORICO);
}

export const perguntarChat = onCall(
  {
    region: "southamerica-east1",
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Faça login para usar o chat.");

    const mensagem = typeof request.data?.mensagem === "string" ? request.data.mensagem.trim() : "";
    if (!mensagem) throw new HttpsError("invalid-argument", "Mensagem vazia.");
    if (mensagem.length > MAX_MENSAGEM) {
      throw new HttpsError("invalid-argument", `Mensagem muito longa (máximo ${MAX_MENSAGEM} caracteres).`);
    }

    if (!(await adquirirTravaGemini(uid))) {
      throw new HttpsError("resource-exhausted", "Aguarde alguns segundos antes de enviar outra pergunta.");
    }

    let falhou = false;
    try {
      const [perfil, itensEmCasa] = await Promise.all([buscarPerfilCasa(uid), obterItensComprados(uid)]);

      const prompt = montarPromptChat({
        pessoas: perfil?.pessoas || [],
        observacoesGerais: perfil?.observacoesGerais || "",
        itensEmCasa,
        historico: sanitizarHistorico(request.data?.historico),
        mensagem,
      });

      // O secret pode vir com quebra de linha no fim quando gravado pelo CLI no Windows.
      const gemini = criarClienteGemini(GEMINI_API_KEY.value().trim());

      try {
        return { resposta: await gemini.gerarTexto(prompt) };
      } catch (erro) {
        console.error("Erro no chat do app:", erro);
        falhou = true;
        throw new HttpsError("internal", mensagemDeErro(erro));
      }
    } finally {
      await liberarTravaGemini(uid, { falhou });
    }
  }
);
