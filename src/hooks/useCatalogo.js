import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const ref = collection(db, 'catalogo')
    const unsub = onSnapshot(ref, (snap) => {
      setErro(false)
      setCatalogo(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        )
      setCarregando(false)
    }, (e) => {
      // Sem isso, um erro de permissão/rede deixava o app em "Carregando...".
      console.error('Erro ao carregar o catálogo:', e)
      setErro(true)
      setCarregando(false)
    })
    return () => unsub()
  }, [])

  return { catalogo, carregando, erro }
}