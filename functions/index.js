import { initializeApp } from "firebase-admin/app";

initializeApp();

export { telegramWebhook } from "./src/telegramWebhook.js";
export { gerarCardapioDiario } from "./src/agendaCardapio.js";
