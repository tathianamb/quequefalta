import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, query, where, doc,
  updateDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { isAdmin } from '../config/admins'

export function useSugestoes(usuario) {
  // Só admin revisa sugestões; os demais nem assinam a coleção.
  const admin = isAdmin(usuario?.email)
  const [pendentes, setPendentes] = useState([])
  const [carregando, setCarregando] = useState(admin)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!admin) return
    const ref = query(collection(db, 'sugestoes'), where('status', '==', 'pendente'))
    const unsub = onSnapshot(ref, (snap) => {
      setErro(false)
      setPendentes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCarregando(false)
    }, (e) => {
      console.error('Erro ao carregar sugestões:', e)
      setErro(true)
      setCarregando(false)
    })
    return () => unsub()
  }, [admin])

  const aprovar = async (sugestao) => {
    const historico = sugestao.precoSugerido != null
      ? [{
          mercado: sugestao.mercadoSugerido || '',
          preco: sugestao.precoSugerido,
          data: sugestao.dataSugerida ? new Date(`${sugestao.dataSugerida}T12:00:00`) : new Date(),
          observacao: `Registrado via Telegram — nota: "${sugestao.nome}"`,
          listaAtiva: sugestao.listaAtiva || null,
        }]
      : []

    // Um lote só: ou cria o produto e marca a sugestão, ou não faz nenhum dos dois.
    const batch = writeBatch(db)
    const novoRef = doc(collection(db, 'catalogo'))
    batch.set(novoRef, {
      nome: sugestao.nome,
      categoria: sugestao.categoria,
      subcategoria: sugestao.subcategoria || '',
      grupoSubstituicao: sugestao.grupoSubstituicao || [],
      historico,
      receitas: [],
      criadoEm: serverTimestamp(),
    })
    batch.update(doc(db, 'sugestoes', sugestao.id), {
      status: 'aprovado',
      aprovadores: [usuario.uid],
      aprovadoEm: serverTimestamp(),
    })
    await batch.commit()
  }

  const rejeitar = async (sugestao) => {
    await updateDoc(doc(db, 'sugestoes', sugestao.id), {
      status: 'rejeitado',
      rejeitadoPor: usuario.email,
      rejeitadoEm: serverTimestamp(),
    })
  }

  const atualizar = async (sugestao, dados) => {
    await updateDoc(doc(db, 'sugestoes', sugestao.id), dados)
  }

  return { pendentes, carregando, erro, aprovar, rejeitar, atualizar }
}