import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { criarClienteTelegram } from "./telegram/api.js";
import { criarClienteGemini } from "./gemini/api.js";
import { buscarPerfisParaHorario } from "./firestore/cardapio.js";
import { gerarCardapioInicial } from "./comandos/cardapio.js";

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// O Firebase CLI grava secrets via stdin no Windows sempre com \r\n ao final,
// então todo secret lido aqui precisa ser saneado antes de usar (mesmo motivo
// documentado em telegramWebhook.js).
const limpar = (valor) => valor.trim();

// Horário configurável só tem resolução de hora cheia: a função roda a cada
// hora e compara com o horarioEnvio salvo em perfilCasa (também "HH:00") —
// horário exato exigiria reconfigurar o Cloud Scheduler via API a cada /casa,
// complexidade desproporcional para um único destinatário.
function horarioAtual() {
  const agora = new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${agora.slice(0, 2)}:00`;
}

export const gerarCardapioDiario = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    secrets: [TELEGRAM_BOT_TOKEN, GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async () => {
    const perfis = await buscarPerfisParaHorario(horarioAtual());
    if (!perfis.length) return;

    const telegram = criarClienteTelegram(limpar(TELEGRAM_BOT_TOKEN.value()));
    const gemini = criarClienteGemini(limpar(GEMINI_API_KEY.value()));

    for (const perfil of perfis) {
      try {
        await gerarCardapioInicial(telegram, gemini, perfil.id, perfil.chatId);
      } catch (erro) {
        console.error(`Erro ao gerar cardápio diário para uid ${perfil.id}:`, erro);
      }
    }
  }
);
