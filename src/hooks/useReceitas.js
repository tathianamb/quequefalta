import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, query, where, doc,
  addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { isAdmin } from '../config/admins'

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
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const admin = isAdmin(usuario?.email)

  useEffect(() => {
    // Rejeitadas ninguém lê; pendentes só o admin revisa.
    const status = admin ? ['aprovada', 'pendente'] : ['aprovada']
    const ref = query(collection(db, 'receitas'), where('status', 'in', status))
    const unsub = onSnapshot(ref, (snap) => {
      setErro(false)
      setReceitas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCarregando(false)
    }, (e) => {
      // Sem isso, um erro deixava a aba sem receitas e sem aviso.
      console.error('Erro ao carregar receitas:', e)
      setErro(true)
      setCarregando(false)
    })
    return () => unsub()
  }, [admin])

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

  return { aprovadas, pendentes, carregando, erro, sugerir, aprovar, rejeitar, atualizar }
}
