const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELO = "gemini-3.6-flash";

const TENTATIVAS_MAXIMAS = 3; // 1 tentativa original + 2 retries
const BACKOFF_MS = 5000;

const aguardar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// modeloReserva (opcional): modelo usado por `pesquisar` quando o principal
// continua sobrecarregado depois das novas tentativas (o "flash" às vezes
// passa horas respondendo 503; o "flash-lite" costuma estar livre).
export function criarClienteGemini(apiKey, { modeloReserva = null } = {}) {
  // pesquisar: liga a busca do Google (grounding) — a resposta vem baseada em
  // páginas reais, listadas em `fontes`.
  async function chamarUmaVez(prompt, { pesquisar = false, modelo = MODELO } = {}) {
    const corpo = { contents: [{ parts: [{ text: prompt }] }] };
    if (pesquisar) corpo.tools = [{ google_search: {} }];
    const resposta = await fetch(`${GEMINI_API_BASE}/${modelo}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
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

    // Com a busca ligada a resposta pode vir em várias partes.
    const candidato = dados.candidates?.[0];
    const texto = (candidato?.content?.parts || []).map((p) => p.text || "").join("").trim();
    if (!texto) {
      const erro = new Error("Gemini API não retornou texto na resposta");
      erro.transitorio = true;
      throw erro;
    }
    const fontes = (candidato?.groundingMetadata?.groundingChunks || [])
      .map((c) => c.web)
      .filter((w) => w?.uri)
      .map((w) => ({ titulo: w.title || null, url: w.uri }));
    return { texto, fontes };
  }

  async function chamar(prompt, opcoes) {
    for (let tentativa = 1; tentativa <= TENTATIVAS_MAXIMAS; tentativa++) {
      try {
        return await chamarUmaVez(prompt, opcoes);
      } catch (erro) {
        const éÚltimaTentativa = tentativa === TENTATIVAS_MAXIMAS;
        const podeTentarDeNovo = erro.transitorio || erro.name === "TypeError"; // TypeError = falha de rede do fetch
        if (éÚltimaTentativa || !podeTentarDeNovo) throw erro;
        await aguardar(BACKOFF_MS * tentativa);
      }
    }
  }

  return {
    async gerarTexto(prompt) {
      return (await chamar(prompt)).texto;
    },
    // Resposta baseada numa busca do Google: { texto, fontes: [{ titulo, url }] }.
    // Em degraus, cada um só se o anterior falhar por cota ou sobrecarga:
    // com busca → sem busca (a busca tem cota própria, que no plano gratuito
    // pode ser zero; aí vale o conhecimento do modelo, sem fontes) → modelo reserva.
    async pesquisar(prompt) {
      const degraus = [{ pesquisar: true }, {}, ...(modeloReserva ? [{ modelo: modeloReserva }] : [])];
      let ultimoErro;
      for (const opcoes of degraus) {
        try {
          return await chamar(prompt, opcoes);
        } catch (erro) {
          const passageiro = erro.message === "gemini_quota_excedida" || erro.transitorio || erro.name === "TypeError";
          if (!passageiro) throw erro;
          console.warn(`Gemini (${opcoes.modelo || MODELO}${opcoes.pesquisar ? ", com busca" : ""}): ${erro.message}`);
          ultimoErro = erro;
        }
      }
      throw ultimoErro;
    },
  };
}
