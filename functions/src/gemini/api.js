const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELO = "gemini-2.0-flash";

export function criarClienteGemini(apiKey) {
  async function chamar(prompt) {
    const resposta = await fetch(`${GEMINI_API_BASE}/${MODELO}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const dados = await resposta.json();

    if (resposta.status === 429) {
      throw new Error("gemini_quota_excedida");
    }
    if (!resposta.ok) {
      throw new Error(`Gemini API falhou: ${dados.error?.message || resposta.status}`);
    }

    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!texto) {
      throw new Error("Gemini API não retornou texto na resposta");
    }
    return texto;
  }

  return {
    gerarCardapio(prompt) {
      return chamar(prompt);
    },
  };
}
