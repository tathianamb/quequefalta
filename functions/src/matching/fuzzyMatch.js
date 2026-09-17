const LIMIAR_MATCH_AUTOMATICO = 0.6;
const LIMIAR_SUGESTAO = 0.3;

export function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Palavras sem valor discriminativo para o nome de um produto — presentes
// tanto em "pimenta do reino" quanto em "pimenta de moça", não devem contar
// como palavra "batida" em comum.
const PALAVRAS_FUNCAO = new Set(["de", "do", "da", "dos", "das", "em", "e", "com", "sem"]);

function tokenizar(texto) {
  return texto.split(" ").filter((t) => t.length > 1 && !PALAVRAS_FUNCAO.has(t));
}

function distanciaLevenshtein(a, b) {
  const linhas = a.length + 1;
  const colunas = b.length + 1;
  const dp = Array.from({ length: linhas }, () => new Array(colunas).fill(0));

  for (let i = 0; i < linhas; i++) dp[i][0] = i;
  for (let j = 0; j < colunas; j++) dp[0][j] = j;

  for (let i = 1; i < linhas; i++) {
    for (let j = 1; j < colunas; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + custo
      );
    }
  }

  return dp[linhas - 1][colunas - 1];
}

function similaridade(a, b) {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distanciaLevenshtein(a, b) / maxLen;
}

/**
 * Score baseado em tokens: fração das palavras do nome do catálogo (produto,
 * geralmente curto e genérico, ex: "Aveia") que aparecem como palavra
 * (com tolerância a pequenas diferenças de grafia) dentro do nome do item
 * extraído da nota (mais longo e específico, ex: "Aveia Nestlé 500g").
 * Essencial para casar nomes abreviados/compostos de cupom fiscal, onde o
 * nome do catálogo é um subconjunto semântico do texto da nota, não uma
 * string quase idêntica.
 */
function scorePorTokens(tokensProduto, tokensItem) {
  if (tokensProduto.length === 0) return 0;

  let casados = 0;
  for (const tokenProduto of tokensProduto) {
    const bateu = tokensItem.some((tokenItem) => {
      if (tokenProduto === tokenItem) return true;
      if (tokenProduto.length >= 4 && tokenItem.length >= 4) {
        return similaridade(tokenProduto, tokenItem) >= 0.8;
      }
      return false;
    });
    if (bateu) casados++;
  }

  // A primeira palavra do nome do catálogo costuma ser o produto em si
  // (ex: "Aveia" em "Aveia em flocos") — pesa mais que as demais, que tendem
  // a ser qualificadores (tipo/variedade) que a nota nem sempre repete.
  const pesoPrimeiraPalavra = 0.6;
  const pesoDemais = 1 - pesoPrimeiraPalavra;
  const primeiraBateu = tokensItem.some((tokenItem) => {
    const tokenProduto = tokensProduto[0];
    if (tokenProduto === tokenItem) return true;
    if (tokenProduto.length >= 4 && tokenItem.length >= 4) {
      return similaridade(tokenProduto, tokenItem) >= 0.8;
    }
    return false;
  });
  if (tokensProduto.length === 1) return casados / tokensProduto.length;

  const fracaoDemais = (casados - (primeiraBateu ? 1 : 0)) / (tokensProduto.length - 1);
  return (primeiraBateu ? pesoPrimeiraPalavra : 0) + pesoDemais * Math.max(0, fracaoDemais);
}

function scorePorTermo(termoNormalizado, nomeProdutoNormalizado) {
  if (nomeProdutoNormalizado === termoNormalizado) return 1;

  if (termoNormalizado.includes(nomeProdutoNormalizado)) {
    // Nome do catálogo (curto/genérico) contido no termo da nota (mais longo).
    // Quanto maior a fração do termo coberta pelo nome do catálogo, mais
    // específico/confiável o match — "alho" dentro de "alho poro" cobre só
    // metade do texto, então não deve empatar com "alho poro" cobrindo tudo.
    const fracaoCoberta = nomeProdutoNormalizado.length / termoNormalizado.length;
    return 0.6 + 0.3 * fracaoCoberta;
  }
  if (nomeProdutoNormalizado.includes(termoNormalizado)) {
    return 0.85;
  }

  const tokensProduto = tokenizar(nomeProdutoNormalizado);
  const scoreTokens = scorePorTokens(tokensProduto, tokenizar(termoNormalizado));

  if (tokensProduto.length > 1) {
    // Nome do catálogo composto (mais de uma palavra): comparar a string
    // inteira por edição de caracteres é enganoso aqui — duas frases do
    // mesmo tamanho com letras em comum (ex: "pimenta dedo de moça" vs
    // "pimenta do reino") dão similaridade alta por acidente, mesmo sendo
    // produtos totalmente diferentes. Tokens carregam o significado melhor.
    return scoreTokens * 0.9;
  }

  // Nome do catálogo de uma palavra só: aí sim vale comparar por edição de
  // caracteres, para tolerar erros de digitação/OCR (ex: "cebola" vs "sebola").
  const scoreString = similaridade(termoNormalizado, nomeProdutoNormalizado);
  return Math.max(scoreString, scoreTokens * 0.9);
}

/**
 * Encontra candidatos do catálogo para um item extraído de nota fiscal.
 * Compara tanto o nome literal (abreviado, como sai do cupom) quanto o nome
 * expandido (nomenclatura comum, sugerido pela extração via IA quando
 * disponível), e fica com o melhor score entre os dois.
 * @param {{ nome: string, nomeExpandido?: string }} item
 * @param {Array<{id: string, nome: string}>} catalogo
 * @returns {{ melhorMatch: {id, nome, score} | null, sugestoes: Array<{id, nome, score}> }}
 */
export function encontrarMatch(item, catalogo) {
  const termos = [item.nome, item.nomeExpandido]
    .filter(Boolean)
    .map(normalizar);

  const candidatos = catalogo.map((produto) => {
    const nomeNormalizado = normalizar(produto.nome);
    const score = Math.max(...termos.map((termo) => scorePorTermo(termo, nomeNormalizado)));
    return { id: produto.id, nome: produto.nome, score };
  });

  candidatos.sort((a, b) => b.score - a.score);

  const primeiro = candidatos[0];
  const melhorMatch = primeiro && primeiro.score >= LIMIAR_MATCH_AUTOMATICO ? primeiro : null;
  const sugestoes = candidatos.filter((c) => c.score >= LIMIAR_SUGESTAO).slice(0, 3);

  return { melhorMatch, sugestoes };
}
