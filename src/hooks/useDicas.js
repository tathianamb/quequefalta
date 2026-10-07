import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, doc,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'

export function useDicas(usuario) {
  const [dicas, setDicas] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const ref = collection(db, 'dicas')
    const unsub = onSnapshot(ref, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Mais recentes primeiro. criadaEm é null por um instante logo após
      // criar (serverTimestamp pendente) — trata como "agora" para a dica
      // nova aparecer no topo.
      const ms = (d) => d.criadaEm?.toMillis?.() ?? Date.now()
      docs.sort((a, b) => ms(b) - ms(a))
      setDicas(docs)
      setCarregando(false)
    })
    return () => unsub()
  }, [])

  const criar = async ({ titulo, texto }) => {
    await addDoc(collection(db, 'dicas'), {
      titulo,
      texto,
      criadaPor: usuario.uid,
      autorNome: usuario.displayName ?? '',
      criadaEm: serverTimestamp(),
    })
  }

  const atualizar = async (dica, { titulo, texto }) => {
    await updateDoc(doc(db, 'dicas', dica.id), {
      titulo,
      texto,
      atualizadaEm: serverTimestamp(),
    })
  }

  const deletar = async (dica) => {
    await deleteDoc(doc(db, 'dicas', dica.id))
  }

  return { dicas, carregando, criar, atualizar, deletar }
}
