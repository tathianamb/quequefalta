import { initializeApp } from "firebase-admin/app";

initializeApp();

export { telegramWebhook } from "./src/telegramWebhook.js";
export { gerarCardapioDiario } from "./src/agendaCardapio.js";
export { perguntarChat, contextoParaClaude } from "./src/chatApp.js";
export { despensaJornal } from "./src/despensaJornal.js";
