const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELO = "gemini-2.0-flash";

const TENTATIVAS_MAXIMAS = 3; // 1 tentativa original + 2 retries
const BACKOFF_MS = 5000;

const aguardar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function criarClienteGemini(apiKey) {
  async function chamarUmaVez(prompt) {
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
      const erro = new Error(`Gemini API falhou: ${dados.error?.message || resposta.status}`);
      // 5xx é transitório (instabilidade momentânea do serviço) — vale
      // tentar de novo. 4xx (exceto 429, já tratado acima) é erro do próprio
      // request (prompt/formato), repetir não muda o resultado.
      erro.transitorio = resposta.status >= 500;
      throw erro;
    }

    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!texto) {
      const erro = new Error("Gemini API não retornou texto na resposta");
      erro.transitorio = true;
      throw erro;
    }
    return texto;
  }

  async function chamar(prompt) {
    for (let tentativa = 1; tentativa <= TENTATIVAS_MAXIMAS; tentativa++) {
      try {
        return await chamarUmaVez(prompt);
      } catch (erro) {
        const éÚltimaTentativa = tentativa === TENTATIVAS_MAXIMAS;
        const podeTentarDeNovo = erro.transitorio || erro.name === "TypeError"; // TypeError = falha de rede do fetch
        if (éÚltimaTentativa || !podeTentarDeNovo) throw erro;
        await aguardar(BACKOFF_MS * tentativa);
      }
    }
  }

  return {
    gerarCardapio(prompt) {
      return chamar(prompt);
    },
  };
}
