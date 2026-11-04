import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, doc,
  addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'

// Firestore recusa campos undefined, e o formulário usa undefined para limpar
// produtoId/grupo quando o nome de um ingrediente é editado.
function limparIngredientes(ingredientes) {
  return (ingredientes ?? []).map(ing => {
    const limpo = {}
    for (const [k, v] of Object.entries(ing)) {
      if (v !== undefined) limpo[k] = v
    }
    return limpo
  })
}

export function useReceitas(usuario) {
  const [receitas, setReceitas] = useState([])

  useEffect(() => {
    const ref = collection(db, 'receitas')
    const unsub = onSnapshot(ref, (snap) => {
      setReceitas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const aprovadas = receitas.filter(r => r.status === 'aprovada')
  const pendentes = receitas.filter(r => r.status === 'pendente')

  const sugerir = async (dados) => {
    const temIngredienteTemporario = (dados.ingredientes ?? []).some(i => i.nomeTemp)
    // "Salvar rascunho" pede status pendente de propósito.
    const status = temIngredienteTemporario || dados.status === 'pendente' ? 'pendente' : 'aprovada'
    await addDoc(collection(db, 'receitas'), {
      ...dados,
      ingredientes: limparIngredientes(dados.ingredientes),
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

  const atualizar = async (receita, dados) => {
    await updateDoc(doc(db, 'receitas', receita.id), {
      ...dados,
      ingredientes: limparIngredientes(dados.ingredientes),
    })
  }

  return { aprovadas, pendentes, sugerir, aprovar, rejeitar, atualizar }
}
