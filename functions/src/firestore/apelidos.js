import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { normalizar } from "../matching/fuzzyMatch.js";

// Memória "nome impresso na nota → produto do catálogo". Cada decisão
// confirmada (preço gravado, ou duplicata aceita) ensina o bot; na próxima
// nota com o mesmo texto o item já entra casado, antes do fuzzy match.
// A chave é o nome ORIGINAL da nota (nunca o corrigido via "✏️ Corrigir
// nome"), normalizado — é ele que vai se repetir nas próximas notas.
// Coleção só do bot (Admin SDK): não precisa de regra em firestore.rules.
const COLECAO = "apelidosNota";

function chaveDoNome(nome) {
  const chave = normalizar(nome || "");
  return chave || null;
}

// Nome que veio impresso na nota. Itens criados antes de existir nomeOriginal
// só têm nomeExtraido (que pode já ter sido corrigido) — é o melhor que há.
export function nomeOriginalDoItem(item) {
  return item.nomeOriginal || item.nomeExtraido;
}

/**
 * Busca os apelidos conhecidos para vários nomes de nota de uma vez.
 * @returns {Promise<Map<string, {produtoId: string, usos: number}>>} chave = nome normalizado
 */
export async function carregarApelidos(nomes) {
  const chaves = [...new Set(nomes.map(chaveDoNome).filter(Boolean))];
  if (!chaves.length) return new Map();
  const db = getFirestore();
  const docs = await db.getAll(...chaves.map((c) => db.collection(COLECAO).doc(c)));
  const apelidos = new Map();
  for (const doc of docs) {
    if (doc.exists) apelidos.set(doc.id, doc.data());
  }
  return apelidos;
}

export function apelidoDoNome(apelidos, nome) {
  const chave = chaveDoNome(nome);
  return chave ? apelidos.get(chave) || null : null;
}

// Marca e tamanho daquele texto de nota, para a próxima nota já vir com eles
// (parser/marcaTamanho.js). Só o que se sabe: um campo desconhecido não apaga
// o que a memória já tinha.
function variacaoParaLembrar({ marca, semMarca, tamanho, medida, unidade } = {}) {
  const campos = {};
  if (marca) Object.assign(campos, { marca, semMarca: false });
  else if (semMarca) Object.assign(campos, { marca: null, semMarca: true });
  if (unidade !== "kg" && tamanho > 0 && medida) Object.assign(campos, { tamanho, medida });
  return campos;
}

// Mesma escolha de novo: reforça (usos+1). Escolha diferente: a decisão mais
// recente vence — quem corrigiu por último sabe melhor o que é aquele texto.
export async function aprenderApelido(nomeNota, produtoId, variacao = {}) {
  const chave = chaveDoNome(nomeNota);
  if (!chave || !produtoId) return;
  const db = getFirestore();
  const ref = db.collection(COLECAO).doc(chave);
  const lembrar = variacaoParaLembrar(variacao);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const atual = doc.exists ? doc.data() : null;
    if (atual?.produtoId === produtoId) {
      tx.update(ref, { usos: FieldValue.increment(1), nomeNota, ...lembrar, atualizadoEm: FieldValue.serverTimestamp() });
      return;
    }
    tx.set(ref, {
      nomeNota,
      produtoId,
      usos: 1,
      produtoIdAnterior: atual?.produtoId || null,
      // Outro produto, mesmo texto: a marca e o tamanho do texto continuam valendo.
      ...variacaoParaLembrar(atual || {}),
      ...lembrar,
      criadoEm: atual?.criadoEm || FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  });
}

// "↩️ Desfazer" enfraquece o apelido (usos-1): pode ser só um clique errado
// em cima de algo que já foi confirmado várias vezes. Já o ❌ num match que
// veio da memória é um "isso está errado" explícito — `tudo: true` apaga o
// apelido de vez. Sem apelido, o item volta ao fuzzy match normal.
// Só mexe se o apelido ainda aponta para o mesmo produto.
export async function esquecerApelido(nomeNota, produtoId, { tudo = false } = {}) {
  const chave = chaveDoNome(nomeNota);
  if (!chave || !produtoId) return;
  const db = getFirestore();
  const ref = db.collection(COLECAO).doc(chave);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists || doc.data().produtoId !== produtoId) return;
    const usos = tudo ? 0 : (doc.data().usos || 1) - 1;
    if (usos <= 0) tx.delete(ref);
    else tx.update(ref, { usos, atualizadoEm: FieldValue.serverTimestamp() });
  });
}
