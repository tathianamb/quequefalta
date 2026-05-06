import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
import { db } from "./firebase";

// Cria a lista própria do usuário no primeiro login
export async function inicializarLista(usuario) {
  const listaRef = doc(db, "listas", usuario.uid);
  const listaSnap = await getDoc(listaRef);

  if (!listaSnap.exists()) {
    await setDoc(listaRef, {
      criadaPor: usuario.email,
      nomeCriador: usuario.displayName,
      criadaEm: new Date(),
      participantes: [usuario.uid],
    });
  }

  const userRef = doc(db, "usuarios", usuario.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      nome: usuario.displayName,
      email: usuario.email,
      listaAtiva: usuario.uid,
      listas: [usuario.uid],
    });
  }

  return usuario.uid;
}

// Obtém a lista ativa do usuário
export async function obterListaAtiva(usuario) {
  const userRef = doc(db, "usuarios", usuario.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  const { listaAtiva, listas } = userSnap.data();

  // Busca detalhes de todas as listas
  const detalhes = await Promise.all(
    (listas || []).map(async (listaId) => {
      const snap = await getDoc(doc(db, "listas", listaId));
      return snap.exists() ? { id: listaId, ...snap.data() } : null;
    }),
  );

  return {
    listaAtiva,
    listas: detalhes.filter(Boolean),
  };
}

// Entra em uma lista compartilhada
export async function entrarNaLista(usuario, listaId) {
  const listaRef = doc(db, "listas", listaId);
  const listaSnap = await getDoc(listaRef);

  if (!listaSnap.exists()) throw new Error("Lista não encontrada");

  const lista = { id: listaId, ...listaSnap.data() };

  // Adiciona usuário como participante
  await updateDoc(listaRef, {
    participantes: arrayUnion(usuario.uid),
  });

  // Adiciona lista ao usuário mas não muda a lista ativa ainda
  await updateDoc(doc(db, "usuarios", usuario.uid), {
    listas: arrayUnion(listaId),
  });

  return lista;
}

// Alterna a lista ativa
export async function alternarLista(usuario, listaId) {
  await updateDoc(doc(db, "usuarios", usuario.uid), {
    listaAtiva: listaId,
  });
}

// Sai de uma lista compartilhada (nunca da própria)
export async function sairDaLista(usuario, listaId) {
  if (listaId === usuario.uid)
    throw new Error("Não é possível sair da sua própria lista");

  await updateDoc(doc(db, "listas", listaId), {
    participantes: arrayRemove(usuario.uid),
  });

  const userRef = doc(db, "usuarios", usuario.uid);
  const userSnap = await getDoc(userRef);
  const { listaAtiva } = userSnap.data();

  await updateDoc(userRef, {
    listas: arrayRemove(listaId),
    // Se estava nessa lista, volta para a própria
    listaAtiva: listaAtiva === listaId ? usuario.uid : listaAtiva,
  });
}
