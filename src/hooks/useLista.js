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

export function useLista(listaAtiva) {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!listaAtiva) return;
    const ref = collection(db, "listas", listaAtiva, "lista");
    const unsub = onSnapshot(ref, (snap) => {
      setLista(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
      setCarregando(false);
    });
    return () => unsub();
  }, [listaAtiva]);

  const adicionarItem = async (produto) => {
    const jaExiste = lista.some((i) => i.produtoId === produto.id);
    if (jaExiste) return false;
    await addDoc(collection(db, "listas", listaAtiva, "lista"), {
      produtoId: produto.id,
      nome: produto.nome,
      categoria: produto.categoria,
      subcategoria: produto.subcategoria,
      grupoSubstituicao: produto.grupoSubstituicao ?? [],
      comprado: false,
      compradoEm: null,
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

  return { lista, carregando, adicionarItem, toggleComprado, removerItem };
}
