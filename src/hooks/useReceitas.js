import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, doc,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'

export function useReceitas(usuario) {
  const [receitas, setReceitas] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const ref = collection(db, 'receitas')
    const unsub = onSnapshot(ref, (snap) => {
      setReceitas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCarregando(false)
    })
    return () => unsub()
  }, [])

  const aprovadas = receitas.filter(r => r.status === 'aprovada')
  const pendentes = receitas.filter(r => r.status === 'pendente')

  const sugerir = async (dados) => {
    const temIngredienteTemporario = (dados.ingredientes ?? []).some(i => i.nomeTemp)
    const status = temIngredienteTemporario ? 'pendente' : 'aprovada'
    const ingredientesLimpos = (dados.ingredientes ?? []).map(ing => {
      const limpo = {}
      for (const [k, v] of Object.entries(ing)) {
        if (v !== undefined) limpo[k] = v
      }
      return limpo
    })
    await addDoc(collection(db, 'receitas'), {
      ...dados,
      ingredientes: ingredientesLimpos,
      status,
      criadaPor: usuario.uid,
      criadaEm: serverTimestamp(),
    })
  }

  const aprovar = async (receita) => {
    await updateDoc(doc(db, 'receitas', receita.id), {
      status: 'aprovada',
      aprovadoPor: usuario.uid,
      aprovadoEm: serverTimestamp(),
    })
  }

  const rejeitar = async (receita) => {
    await updateDoc(doc(db, 'receitas', receita.id), {
      status: 'rejeitada',
      rejeitadoPor: usuario.uid,
      rejeitadoEm: serverTimestamp(),
    })
  }

  const deletar = async (receita) => {
    await deleteDoc(doc(db, 'receitas', receita.id))
  }

  const atualizar = async (receita, dados) => {
    await updateDoc(doc(db, 'receitas', receita.id), dados)
  }

  return { receitas, aprovadas, pendentes, carregando, sugerir, aprovar, rejeitar, deletar, atualizar }
}
