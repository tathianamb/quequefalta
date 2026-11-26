import { initializeApp } from "firebase-admin/app";

initializeApp();

export { telegramWebhook } from "./src/telegramWebhook.js";
export { perguntarChat } from "./src/chatApp.js";
export { pedirNaLista } from "./src/listaNutreai.js";
