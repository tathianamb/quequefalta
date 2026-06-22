import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, serverTimestamp, query, where, getDocs,
} from 'firebase/firestore'
import { db } from '../config/firebase'

function normalizar(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function useAtributos() {
  const [atributos, setAtributos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const ref = collection(db, 'atributos')
    const unsub = onSnapshot(ref, (snap) => {
      setAtributos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCarregando(false)
    })
    return () => unsub()
  }, [])

  const buscar = (termo) => {
    const termoNorm = normalizar(termo)
    return atributos.filter(a => normalizar(a.nome).includes(termoNorm))
  }

  const criar = async (nome) => {
    const nomeNorm = normalizar(nome)

    // Verifica se já existe localmente (state já carregado)
    const existente = atributos.find(a => normalizar(a.nome) === nomeNorm)
    if (existente) return existente

    // Verifica no Firestore (para evitar duplicatas em estado não carregado)
    const q = query(collection(db, 'atributos'), where('nomeNorm', '==', nomeNorm))
    const snap = await getDocs(q)
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() }
    }

    const ref = await addDoc(collection(db, 'atributos'), {
      nome,
      nomeNorm,
      criadoEm: serverTimestamp(),
    })
    return { id: ref.id, nome, nomeNorm }
  }

  return { atributos, carregando, buscar, criar }
}
