const MENSAGEM_ERRO_GEMINI = {
  gemini_quota_excedida: "Cheguei ao limite de uso do Gemini por hoje. Tente de novo mais tarde.",
};

export function mensagemDeErro(erro) {
  return MENSAGEM_ERRO_GEMINI[erro.message] || "Não consegui gerar isso agora. Tente de novo em instantes.";
}
