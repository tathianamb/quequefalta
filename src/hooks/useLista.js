import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const SEM_CATALOGO = [];
const MS_AVISO = 5000;

// Todas as escritas daqui são "disparar e seguir": a promise do Firestore só
// resolve quando o servidor confirma, mas a gravação local e o onSnapshot são
// imediatos (e a fila sincroniza quando o sinal volta). Por isso as funções
// decidem de forma síncrona com o estado local, devolvem a decisão na hora e
// tratam o erro da promise por conta própria (console.error + `avisoGravacao`).
export function useLista(listaAtiva, catalogo = SEM_CATALOGO) {
  // O estado guarda de qual lista são os itens: ao trocar de casa, os itens da
  // anterior não são exibidos (nem tocados) enquanto o novo snapshot não chega.
  const [estado, setEstado] = useState({ listaId: null, itens: [], erro: false });
  const [avisoGravacao, setAvisoGravacao] = useState(null);

  // Itens do último snapshot (para decidir sem depender do render) e produtoIds
  // já presentes ou com criação em andamento. A checagem de duplicata usa estes
  // dois sets, preenchidos de forma síncrona ANTES do addDoc: laços que criam
  // vários itens na mesma closure (ex.: "Adicionar faltantes") não duplicam.
  const itensRef = useRef([]);
  const idsRef = useRef(new Set());
  const pendentesRef = useRef(new Set());
  const avisoTimerRef = useRef(null);

  useEffect(() => {
    itensRef.current = [];
    idsRef.current = new Set();
    pendentesRef.current = new Set();
    if (!listaAtiva) return;
    const ref = collection(db, "listas", listaAtiva, "lista");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const itens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        itensRef.current = itens;
        idsRef.current = new Set(itens.map((i) => i.produtoId).filter(Boolean));
        // O que já apareceu no snapshot deixa de ser "pendente".
        for (const id of idsRef.current) pendentesRef.current.delete(id);
        setEstado({ listaId: listaAtiva, itens, erro: false });
      },
      (e) => {
        // Sem isso, um erro (ex.: lista de um grupo do qual a pessoa saiu)
        // deixava a lista presa em "Carregando...".
        console.error("Erro ao carregar a lista:", e);
        setEstado({ listaId: listaAtiva, itens: [], erro: true });
      },
    );
    return () => unsub();
  }, [listaAtiva]);

  useEffect(() => () => clearTimeout(avisoTimerRef.current), []);

  const daListaAtiva = estado.listaId === listaAtiva;
  const itensRaw = daListaAtiva ? estado.itens : SEM_CATALOGO;
  const carregando = listaAtiva ? !daListaAtiva : false;
  const erro = daListaAtiva && estado.erro;

  const avisarErro = (mensagem, e) => {
    console.error(mensagem, e);
    setAvisoGravacao(mensagem);
    clearTimeout(avisoTimerRef.current);
    avisoTimerRef.current = setTimeout(() => setAvisoGravacao(null), MS_AVISO);
  };

  // Cruza itens com catálogo para montar objetos completos
  const lista = useMemo(() => {
    const porId = new Map(catalogo.map((p) => [p.id, p]));
    return itensRaw
      .map((item) => {
        const prod = porId.get(item.produtoId);
        if (!prod) {
          // Produto excluído do catálogo: o item fica órfão (só tem produtoId,
          // sem nome) e quebraria a busca/ordenação — omite. Itens antigos que
          // guardam o próprio nome continuam aparecendo como fallback.
          return item.nome ? item : null;
        }
        return {
          id: item.id,
          produtoId: item.produtoId,
          comprado: item.comprado,
          nome: prod.nome,
          categoria: prod.categoria,
          subcategoria: prod.subcategoria,
          grupoSubstituicao: prod.grupoSubstituicao ?? [],
          receitas: prod.receitas ?? [],
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"));
  }, [itensRaw, catalogo]);

  // Devolve true (síncrono) se criou, false se o produto já está na lista.
  const criarItem = (produto, comprado) => {
    if (!listaAtiva) return false;
    if (idsRef.current.has(produto.id) || pendentesRef.current.has(produto.id)) return false;
    pendentesRef.current.add(produto.id);
    addDoc(collection(db, "listas", listaAtiva, "lista"), {
      produtoId: produto.id,
      comprado,
    }).catch((e) => {
      pendentesRef.current.delete(produto.id);
      avisarErro("Não foi possível adicionar à lista. Tente de novo.", e);
    });
    return true;
  };

  const adicionarItem = (produto) => criarItem(produto, false);
  const adicionarItemComprado = (produto) => criarItem(produto, true);

  // Botão de casinha do catálogo: liga/desliga "tem em casa". Fora da lista,
  // cria o item já comprado; na lista, alterna o comprado (desligar deixa o
  // item na lista, a comprar). Devolve o novo estado: true = em casa.
  const alternarEmCasa = (produto) => {
    const item = itensRef.current.find((i) => i.produtoId === produto.id);
    if (!item) {
      adicionarItemComprado(produto);
      return true;
    }
    toggleComprado(item);
    return !item.comprado;
  };

  const toggleComprado = (item) => {
    if (!listaAtiva) return;
    const ref = doc(db, "listas", listaAtiva, "lista", item.id);
    updateDoc(ref, { comprado: !item.comprado }).catch((e) =>
      avisarErro("Não foi possível atualizar o item. Tente de novo.", e),
    );
  };

  // Devolve a promise (já com o erro tratado) para quem precisa esperar o
  // servidor, como a exclusão de produto do catálogo.
  const removerItem = (item) => {
    if (!listaAtiva) return Promise.resolve();
    if (item.produtoId) {
      idsRef.current.delete(item.produtoId);
      pendentesRef.current.delete(item.produtoId);
    }
    return deleteDoc(doc(db, "listas", listaAtiva, "lista", item.id)).catch((e) => {
      if (item.produtoId) idsRef.current.add(item.produtoId);
      avisarErro("Não foi possível remover o item. Tente de novo.", e);
    });
  };

  return {
    lista,
    carregando,
    erro,
    avisoGravacao,
    adicionarItem,
    adicionarItemComprado,
    alternarEmCasa,
    toggleComprado,
    removerItem,
  };
}
