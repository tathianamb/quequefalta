// Fake mínimo de um único doc Firestore, o suficiente para simular o fluxo
// real de leitura/escrita usado por firestore/cardapio.js sem precisar de
// rede — set({merge:true}) com dot-paths e objetos aninhados, e runTransaction.
export function criarFakeDoc(dadosIniciais = {}) {
  let dados = structuredClone(dadosIniciais);

  function aplicarDotPath(alvo, caminho, valor) {
    const partes = caminho.split(".");
    let atual = alvo;
    for (let i = 0; i < partes.length - 1; i++) {
      if (typeof atual[partes[i]] !== "object" || atual[partes[i]] === null) {
        atual[partes[i]] = {};
      }
      atual = atual[partes[i]];
    }
    atual[partes[partes.length - 1]] = valor;
  }

  function mergeProfundo(alvo, origem) {
    for (const chave of Object.keys(origem)) {
      if (chave.includes(".")) {
        aplicarDotPath(alvo, chave, origem[chave]);
        continue;
      }
      const valor = origem[chave];
      if (valor !== null && typeof valor === "object" && !Array.isArray(valor) && !(valor instanceof Date)) {
        if (typeof alvo[chave] !== "object" || alvo[chave] === null || Array.isArray(alvo[chave])) {
          alvo[chave] = {};
        }
        mergeProfundo(alvo[chave], valor);
      } else {
        alvo[chave] = valor;
      }
    }
  }

  return {
    async get() {
      return {
        exists: Object.keys(dados).length > 0,
        data: () => (Object.keys(dados).length > 0 ? structuredClone(dados) : undefined),
      };
    },
    async set(patch, opcoes = {}) {
      if (opcoes.merge) {
        mergeProfundo(dados, patch);
      } else {
        dados = structuredClone(patch);
      }
    },
    async update(patch) {
      mergeProfundo(dados, patch);
    },
    _snapshot: () => structuredClone(dados),
  };
}

export function criarFakeFirestore(docsIniciais = {}) {
  const docs = new Map(Object.entries(docsIniciais).map(([id, dados]) => [id, criarFakeDoc(dados)]));

  function docRef(id) {
    if (!docs.has(id)) docs.set(id, criarFakeDoc({}));
    return docs.get(id);
  }

  return {
    collection(nome) {
      return {
        doc(id) {
          return docRef(id);
        },
      };
    },
    async runTransaction(callback) {
      // Simplificado: sem isolamento real, só delega para o mesmo doc.
      const tx = {
        async get(ref) {
          return ref.get();
        },
        set(ref, patch, opcoes) {
          // runTransaction do SDK real é síncrono na chamada (agenda o write);
          // aqui simplificamos executando na hora.
          ref.set(patch, opcoes);
        },
      };
      return callback(tx);
    },
    _docs: docs,
  };
}
