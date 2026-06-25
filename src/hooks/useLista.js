import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
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
      if (!prod) return item; // fallback para itens antigos sem match
      return {
        id: item.id,
        produtoId: item.produtoId,
        comprado: item.comprado,
        compradoEm: item.compradoEm,
        adicionadoEm: item.adicionadoEm,
        nome: prod.nome,
        categoria: prod.categoria,
        subcategoria: prod.subcategoria,
        grupoSubstituicao: prod.grupoSubstituicao ?? [],
        receitas: prod.receitas ?? [],
      };
    })
    .sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"));

  const adicionarItem = async (produto) => {
    const jaExiste = itensRaw.some((i) => i.produtoId === produto.id);
    if (jaExiste) return false;
    await addDoc(collection(db, "listas", listaAtiva, "lista"), {
      produtoId: produto.id,
      comprado: false,
      compradoEm: null,
      adicionadoEm: serverTimestamp(),
    });
    return true;
  };

  const adicionarItemComprado = async (produto) => {
    const jaExiste = itensRaw.some((i) => i.produtoId === produto.id);
    if (jaExiste) return false;
    await addDoc(collection(db, "listas", listaAtiva, "lista"), {
      produtoId: produto.id,
      comprado: true,
      compradoEm: new Date(),
      adicionadoEm: serverTimestamp(),
    });
    return true;
  };

  const toggleComprado = async (item) => {
    const ref = doc(db, "listas", listaAtiva, "lista", item.id);
    await updateDoc(ref, {
      comprado: !item.comprado,
      compradoEm: !item.comprado ? new Date() : null,
    });
  };

  const removerItem = async (item) => {
    await deleteDoc(doc(db, "listas", listaAtiva, "lista", item.id));
  };

  return { lista, carregando, adicionarItem, adicionarItemComprado, toggleComprado, removerItem };
}
