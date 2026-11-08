import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

export function useLista(listaAtiva, catalogo = []) {
  const [itensRaw, setItensRaw] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!listaAtiva) return;
    const ref = collection(db, "listas", listaAtiva, "lista");
    const unsub = onSnapshot(ref, (snap) => {
      setItensRaw(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCarregando(false);
    });
    return () => unsub();
  }, [listaAtiva]);

  // Cruza itens com catálogo para montar objetos completos
  const lista = itensRaw
    .map((item) => {
      const prod = catalogo.find((p) => p.id === item.produtoId);
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

  const criarItem = async (produto, comprado) => {
    const jaExiste = itensRaw.some((i) => i.produtoId === produto.id);
    if (jaExiste) return false;
    await addDoc(collection(db, "listas", listaAtiva, "lista"), {
      produtoId: produto.id,
      comprado,
    });
    return true;
  };

  const adicionarItem = (produto) => criarItem(produto, false);
  const adicionarItemComprado = (produto) => criarItem(produto, true);

  // Botão de casinha do catálogo: liga/desliga "tem em casa". Fora da lista,
  // cria o item já comprado; na lista, alterna o comprado (desligar deixa o
  // item na lista, a comprar). Devolve o novo estado: true = em casa.
  const alternarEmCasa = async (produto) => {
    const item = itensRaw.find((i) => i.produtoId === produto.id);
    if (!item) {
      await adicionarItemComprado(produto);
      return true;
    }
    await toggleComprado(item);
    return !item.comprado;
  };

  const toggleComprado = async (item) => {
    const ref = doc(db, "listas", listaAtiva, "lista", item.id);
    await updateDoc(ref, { comprado: !item.comprado });
  };

  const removerItem = async (item) => {
    await deleteDoc(doc(db, "listas", listaAtiva, "lista", item.id));
  };

  return { lista, carregando, adicionarItem, adicionarItemComprado, alternarEmCasa, toggleComprado, removerItem };
}
